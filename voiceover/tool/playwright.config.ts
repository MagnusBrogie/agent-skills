import { withGuidepup } from "@guidepup/playwright";
import { devices } from "@playwright/test";

// withGuidepup forces one worker, no parallelism, and a headed browser:
// there is only one VoiceOver, and it cannot read a headless window.
export default withGuidepup({
    testDir: "specs",
    reporter: "list",
    timeout: 5 * 60_000,
    retries: 0,
    use: {
        locale: process.env.VO_LOCALE || undefined,
        timezoneId: process.env.VO_TIMEZONE || undefined,
        storageState: process.env.VO_STORAGE_STATE || undefined,
    },
    projects: [{ name: "webkit", use: { ...devices["Desktop Safari"] } }],
});
