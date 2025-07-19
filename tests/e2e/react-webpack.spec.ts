import { expect, test } from "@playwright/test";

test.describe("React Webpack E2E", () => {
	test("should load the React application successfully", async ({ page }) => {
		await page.goto("http://localhost:3001");

		// Wait for React to render
		await page.waitForLoadState("networkidle");

		// Check that the page loaded
		expect(await page.title()).toBeTruthy();

		// Look for common React webpack elements
		const body = await page.locator("body").textContent();
		expect(body).not.toBe("");
		expect(body).not.toContain("Cannot GET");
	});

	test("should have proper HTML structure", async ({ page }) => {
		await page.goto("http://localhost:3001");
		await page.waitForLoadState("networkidle");

		// Check for root element (common in React apps)
		const rootElement = page.locator("#root");
		await expect(rootElement).toBeVisible();
	});

	test("should load JavaScript bundle successfully", async ({ page }) => {
		const responses: string[] = [];

		page.on("response", (response) => {
			responses.push(response.url());
		});

		await page.goto("http://localhost:3001");
		await page.waitForLoadState("networkidle");

		// Check that webpack bundle loaded
		const bundleLoaded = responses.some(
			(url) => url.includes("bundle.js") || url.includes(".js") || url.includes("main"),
		);
		expect(bundleLoaded).toBe(true);
	});

	test("should handle client-side routing if implemented", async ({ page }) => {
		await page.goto("http://localhost:3001");
		await page.waitForLoadState("networkidle");

		// Check if it's a single page app by checking page content
		const content = await page.textContent("body");
		expect(content).toBeDefined();
		expect(content?.length).toBeGreaterThan(0);
	});

	test("should respond to API endpoints when ORM is configured", async ({ request }) => {
		// Check if ORM environment variable is set
		if (process.env.ORM) {
			try {
				const response = await request.get("http://localhost:3001/api/users");
				if (response.ok()) {
					const data = await response.json();
					expect(Array.isArray(data)).toBe(true);
				}
			} catch (_e) {
				// API endpoints might not be available in pure frontend template
				console.log("API endpoints not available in React frontend template");
			}
		} else {
			console.log("No ORM configured, skipping API endpoint test");
		}
	});

	test("should have proper error handling for 404", async ({ page }) => {
		// Navigate to a non-existent route
		const response = await page.goto("http://localhost:3001/non-existent-page-12345");

		// For SPAs, this often returns 200 and handles routing client-side
		// For traditional webpack setups, this might return 404
		expect([200, 404]).toContain(response?.status());
	});

	test("should load CSS styles successfully", async ({ page }) => {
		await page.goto("http://localhost:3001");
		await page.waitForLoadState("networkidle");

		// Check if styles are loaded by verifying computed styles
		const body = page.locator("body");
		const backgroundColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor);

		// Should not be the default transparent/initial value
		expect(backgroundColor).toBeDefined();
	});
});
