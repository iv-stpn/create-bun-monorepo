import { defineConfig, devices } from "@playwright/test";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: "./tests/e2e",
	/* Run tests in files in parallel */
	fullyParallel: false, // Set to false to avoid port conflicts
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	/* Opt out of parallel tests on CI. */
	workers: 1, // Single worker to avoid port conflicts
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: [["html"], ["json", { outputFile: "test-results.json" }], process.env.CI ? ["github"] : ["list"]],
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		// baseURL: 'http://127.0.0.1:3000',

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: "on-first-retry",

		/* Screenshot on failure */
		screenshot: "only-on-failure",

		/* Video on failure */
		video: "retain-on-failure",
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],

	/* Global setup and teardown */
	globalTimeout: 600000, // 10 minutes for all tests
	timeout: 60000, // 1 minute per test
	expect: {
		timeout: 15000, // 15 seconds for assertions
	},

	/* Run your local dev server before starting the tests */
	webServer: undefined, // We'll manage servers manually in our test scripts
});
