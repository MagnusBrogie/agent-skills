#!/usr/bin/env bash
# Print the raw facts about the current worktree and its pull request.
# Read-only, except for a `git fetch` of the base and the branch (skip with --no-fetch).
#
#   gather.sh [--no-fetch] [base-branch]
#
# Every section is printed even when empty, so a missing section means the
# script failed there, not that there was nothing to report.

set -u

fetch=1
base=""
for arg in "$@"; do
  case "$arg" in
    --no-fetch) fetch=0 ;;
    *) base="$arg" ;;
  esac
done

section() { printf '\n## %s\n' "$1"; }

# Run gh, hiding its stderr (it prints usage hints there) unless it fails.
gh_quiet() {
  local err out status
  err=$(mktemp)
  out=$(gh "$@" 2>"$err")
  status=$?
  if [ $status -ne 0 ]; then
    printf '(gh %s failed: %s)\n' "$1 $2" "$(tr '\n' ' ' <"$err")"
  else
    printf '%s\n' "$out"
  fi
  rm -f "$err"
  return $status
}

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "Not a git repository."; exit 1; }

branch=$(git branch --show-current)
git_dir=$(git rev-parse --absolute-git-dir)

# ---------------------------------------------------------------- pull request

# pr_state: found | none (gh answered: no PR) | error (gh could not answer) | nogh
pr_state=none
pr_number=""
pr_error=""
if ! command -v gh >/dev/null 2>&1; then
  pr_state=nogh
elif [ -n "$branch" ]; then
  err=$(mktemp)
  if info=$(gh pr view --json number,baseRefName --jq '"\(.number) \(.baseRefName)"' 2>"$err"); then
    pr_state=found
    pr_number=${info%% *}
    [ -z "$base" ] && base=${info#* }
  elif grep -qi 'no pull requests found' "$err"; then
    pr_state=none
  else
    pr_state=error
    pr_error=$(grep -v '^hint' "$err" | head -3 | tr '\n' ' ')
  fi
  rm -f "$err"
fi
if [ -z "$base" ]; then
  base=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
fi
[ -z "$base" ] && base=main

fetched="no (--no-fetch)"
if [ $fetch -eq 1 ]; then
  if git fetch --quiet origin "$base" ${branch:+"$branch"} 2>/dev/null \
    || git fetch --quiet origin "$base" 2>/dev/null; then
    fetched="yes"
  else
    fetched="FAILED - the counts below use refs that may be out of date"
  fi
fi

base_ref="origin/$base"
git rev-parse --verify --quiet "$base_ref" >/dev/null || base_ref="$base"

# ------------------------------------------------------------------------- git

section "Worktree"
echo "path:     $(git rev-parse --show-toplevel)"
echo "branch:   ${branch:-(detached HEAD at $(git rev-parse --short HEAD))}"
echo "base:     $base_ref"
echo "fetched:  $fetched"
echo "head:     $(git log -1 --format='%h %s (%cr)')"

for marker in rebase-merge rebase-apply MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD BISECT_LOG; do
  [ -e "$git_dir/$marker" ] && echo "IN PROGRESS: $marker"
done

section "Uncommitted (git status --short)"
git status --short
[ -z "$(git status --short)" ] && echo "(clean)"

section "Against the branch's remote"
upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null)
if [ -n "$upstream" ]; then
  read -r behind ahead < <(git rev-list --left-right --count "$upstream"...HEAD)
  echo "upstream: $upstream"
  echo "unpushed commits: $ahead"
  echo "remote commits not here: $behind"
  [ "$ahead" -gt 0 ] && git log --format='  unpushed  %h %s' "$upstream"..HEAD
  [ "$behind" -gt 0 ] && git log --format='  remote    %h %s (%an)' HEAD.."$upstream"
else
  echo "upstream: none (the branch has never been pushed, or has no tracking ref)"
fi

section "Against the base"
if git rev-parse --verify --quiet "$base_ref" >/dev/null; then
  read -r behind ahead < <(git rev-list --left-right --count "$base_ref"...HEAD)
  merge_base=$(git merge-base "$base_ref" HEAD)
  echo "merge-base: $(git rev-parse --short "$merge_base")"
  echo "commits on the branch: $ahead"
  echo "base commits not in the branch: $behind"
  git log --format='  %h %s' "$merge_base"..HEAD
  echo "changed against the merge-base (including uncommitted):"
  git diff --shortstat "$merge_base"
  if [ "$behind" -gt 0 ]; then
    # Files changed on both sides are where a rebase or merge can conflict.
    overlap=$(comm -12 \
      <(git diff --name-only "$merge_base" HEAD | sort) \
      <(git diff --name-only "$merge_base" "$base_ref" | sort))
    if [ -n "$overlap" ]; then
      echo "files changed on both sides since the merge-base:"
      printf '%s\n' "$overlap" | sed 's/^/  /'
    else
      echo "no file is changed on both sides since the merge-base"
    fi
  fi
else
  echo "base ref $base_ref not found"
fi

# ---------------------------------------------------------------- pull request

section "Pull request"
case "$pr_state" in
  nogh)
    echo "NOT READ: gh is not installed. Nothing about the pull request is known."
    exit 0 ;;
  error)
    echo "NOT READ: gh could not answer, so whether a pull request exists is unknown."
    echo "gh said: $pr_error"
    exit 0 ;;
  none)
    if [ -z "$branch" ]; then
      echo "none: HEAD is detached, so there is no branch to have a pull request."
    else
      echo "none: GitHub has no pull request for the branch $branch."
    fi
    exit 0 ;;
esac

echo "head here:      $(git rev-parse --short=9 HEAD)"
gh_quiet pr view --json number,url,title,state,isDraft,author,baseRefName,headRefOid,mergeable,mergeStateStatus,reviewDecision,autoMergeRequest,reviewRequests,assignees,labels,createdAt,updatedAt,closedAt,mergedAt,body --jq '
  "head on GitHub: \(.headRefOid[0:9])",
  "#\(.number) \(.title)",
  .url,
  "state: \(.state)\(if .isDraft then " (DRAFT)" else "" end)\(if .mergedAt then " at \(.mergedAt)" elif .closedAt then " at \(.closedAt)" else "" end)",
  "author: \(.author.login)",
  "base: \(.baseRefName)",
  "mergeable: \(.mergeable)   merge state: \(.mergeStateStatus)",
  "review decision: \(if (.reviewDecision // "") == "" then "none" else .reviewDecision end)",
  "auto-merge: \(if .autoMergeRequest then "on" else "off" end)",
  "review requested from: \([.reviewRequests[] | .login // .name // .slug] | join(", ") | if . == "" then "nobody" else . end)",
  "assignees: \([.assignees[].login] | join(", ") | if . == "" then "none" else . end)",
  "labels: \([.labels[].name] | join(", ") | if . == "" then "none" else . end)",
  "created: \(.createdAt)   updated: \(.updatedAt)",
  "",
  "## PR description",
  (if (.body // "") == "" then "(empty)" else .body end)'

section "Checks (for the head on GitHub, not for unpushed commits)"
# gh pr checks exits non-zero when a check fails or is pending, so judge by the output.
err=$(mktemp)
checks=$(gh pr checks --json name,bucket,workflow,link --jq '
  if length == 0 then "(no checks reported)" else
    (group_by(.bucket) | map("\(.[0].bucket): \(length)") | join("   ")),
    (.[] | select(.bucket != "pass" and .bucket != "skipping")
         | "  \(.bucket)  \(.workflow) / \(.name)  \(.link)")
  end' 2>"$err")
if [ -n "$checks" ]; then
  printf '%s\n' "$checks"
elif grep -qi 'no checks reported' "$err"; then
  echo "(no checks reported)"
else
  echo "NOT READ: gh pr checks failed: $(grep -v '^hint' "$err" | head -3 | tr '\n' ' ')"
fi
rm -f "$err"

# One query for the reviews, the review threads, and their comments.
# clip(n) cuts a long body and says so; nothing is shortened silently.
gh_quiet api graphql -F owner='{owner}' -F repo='{repo}' -F pr="$pr_number" -f query='
  query($owner:String!,$repo:String!,$pr:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$pr){
    headRefOid author{login}
    reviews(last:100){totalCount nodes{author{login __typename} state submittedAt commit{oid}}}
    reviewThreads(first:100){totalCount nodes{isResolved isOutdated path line originalLine
      comments(first:50){totalCount nodes{author{login __typename} body url createdAt}}}}}}}' --jq '
  def clip(n): if length > n then "\(.[0:n]) ...[TRUNCATED: \(length - n) more characters, read the rest at the link]" else . end;
  def indent: gsub("\r?\n"; "\n    ");
  .data.repository.pullRequest as $pr
  | $pr.reviewThreads as $t
  | "",
    "## Reviews (latest per reviewer)",
    ( [$pr.reviews.nodes[] | select(.state != "PENDING" and .author.login != $pr.author.login)]
      | group_by(.author.login) | map(sort_by(.submittedAt) | last) | sort_by(.submittedAt)
      | if length == 0 then "(none)" else
          (.[] | "\(.author.login // "ghost"): \(.state) at \(.submittedAt)  "
                 + (if (.commit.oid // "") == "" then "(commit unknown)"
                    elif .commit.oid == $pr.headRefOid then "(on the current head on GitHub)"
                    else "(on \(.commit.oid[0:9]), an OLDER head: what was pushed since is unreviewed by them)" end))
        end ),
    (if $pr.reviews.totalCount > 100 then "WARNING: \($pr.reviews.totalCount) reviews, only the latest 100 were read." else empty end),
    "",
    "## Unresolved review threads",
    "threads: \($t.totalCount) total, \([$t.nodes[] | select(.isResolved | not)] | length) unresolved",
    (if $t.totalCount > 100 then "WARNING: only the first 100 of \($t.totalCount) threads were read; later unresolved threads are missing here." else empty end),
    ($t.nodes[] | select(.isResolved | not)
      | "",
        "- \(.path):\(.line // .originalLine // "?")\(if .isOutdated then "  (OUTDATED: the code under it has changed)" else "" end)",
        "  \(.comments.nodes[0].url)",
        (.comments.nodes[]
          | "  [\(.author.login // "ghost")\(if .author.__typename == "Bot" then ", bot" else "" end), \(.createdAt[0:10])] \(.body | clip(4000) | indent)"),
        (if .comments.totalCount > (.comments.nodes | length)
         then "  WARNING: \(.comments.totalCount) comments in this thread, only the first \(.comments.nodes | length) are shown; the last word below may be wrong."
         else empty end),
        "  last word: \(.comments.nodes | last | .author.login // "ghost")")'

section "Conversation comments and review summaries"
gh_quiet pr view --json comments,reviews --jq '
  def clip(n): if length > n then "\(.[0:n]) ...[TRUNCATED: \(length - n) more characters, read the rest on the pull request]" else . end;
  ([.comments[] | {at: .createdAt, who: .author.login, kind: "comment", body}]
   + [.reviews[] | select((.body // "") != "") | {at: .submittedAt, who: .author.login, kind: "review \(.state)", body}])
  | sort_by(.at)
  | if length == 0 then "(none)" else
      (.[] | "- [\(.who), \(.kind), \(.at[0:10])] \(.body | clip(3000) | gsub("\r?\n"; "\n    "))")
    end'
