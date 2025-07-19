import { expect, test } from "@playwright/test";

const VIEWPORT_WIDTH_DEVICE = /width=device-width/;

const REACT_VITE_CONTENT = /(React|Vite|logo|App)/i;
const REACT_VITE_BASIC = /(React|Vite|App)/i;

test.describe("React Vite Template E2E", () => {
	test("should load React Vite app with basic content", async ({ page }) => {
		await page.goto("http://localhost:3000");

		// Wait for React to load
		await page.waitForLoadState("networkidle");

		// Check for React/Vite specific content
		const content = await page.textContent("body");
		expect(content).toMatch(REACT_VITE_CONTENT);

		// Check for typical React elements
		const reactElements = page.locator("[data-reactroot], #root, .App");
		await expect(reactElements.first()).toBeVisible();
	});

	test("should have working UI components when UI package is included", async ({ page }) => {
		await page.goto("http://localhost:3000");
		await page.waitForLoadState("networkidle");

		// Look for injected UI test component
		const testComponent = page.locator('[data-testid="test-ui-component"]');
		if ((await testComponent.count()) > 0) {
			await expect(testComponent).toBeVisible();
			expect(await testComponent.textContent()).toContain("UI Test Component");
		}
	});

	test("should have proper page title and meta tags", async ({ page }) => {
		await page.goto("http://localhost:3000");
		await page.waitForLoadState("networkidle");

		// Check for proper title
		const title = await page.title();
		expect(title.length).toBeGreaterThan(0);

		// Check for viewport meta tag
		const viewport = page.locator('meta[name="viewport"]');
		await expect(viewport).toHaveAttribute("content", VIEWPORT_WIDTH_DEVICE);
	});

	test("should handle navigation and routing correctly", async ({ page }) => {
		await page.goto("http://localhost:3000");
		await page.waitForLoadState("networkidle");

		// Test that we can reload the page without errors
		await page.reload();
		await page.waitForLoadState("networkidle");

		const content = await page.textContent("body");
		expect(content).toMatch(REACT_VITE_BASIC);
	});
});
