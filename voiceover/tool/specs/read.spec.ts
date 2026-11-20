import { voiceOverTest as test } from "@guidepup/playwright";

// Reads a page with VoiceOver and prints what it says, one line per stop.
// Driven by environment variables so that no spec has to be written for a
// plain read-through. See ../../SKILL.md.
const url = process.env.VO_URL;
const steps = Number(process.env.VO_STEPS ?? 30);
const waitFor = process.env.VO_WAIT_FOR;
const focus = process.env.VO_FOCUS;
const until = process.env.VO_UNTIL?.toLowerCase();

test("read the page with VoiceOver", async ({ page, voiceOver }) => {
    test.skip(!url, "Set VO_URL to the page to read");

    await page.goto(url as string, { waitUntil: "load" });
    if (waitFor) {
        await page.locator(waitFor).first().waitFor();
    }

    await voiceOver.navigateToWebContent();
    if (focus) {
        // The VoiceOver cursor follows keyboard focus.
        await page.locator(focus).first().focus();
    }

    const transcript = [await voiceOver.lastSpokenPhrase()];
    for (let step = 0; step < steps; step++) {
        await voiceOver.next();
        const phrase = await voiceOver.lastSpokenPhrase();
        transcript.push(phrase);
        if (until && phrase.toLowerCase().includes(until)) {
            break;
        }
    }

    console.log("\n--- VoiceOver transcript ---");
    transcript.forEach((phrase, index) => {
        console.log(`${String(index + 1).padStart(3)}. ${phrase}`);
    });
    console.log("--- end ---\n");
});
