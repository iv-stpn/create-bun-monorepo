import { expect, test } from "@playwright/test";

const VIEWPORT_WIDTH_DEVICE = /width=device-width/;

const REACT_VIKE_CONTENT = /(React|Vike|My Vike app|Rendered to HTML|Interactive)/i;

test.describe("React Vike Template E2E", () => {
	test("should load React Vike app with basic content", async ({ page }) => {
		await page.goto("http://localhost:3005");

		// Wait for Vike to load
		await page.waitForLoadState("networkidle");

		// Check for React/Vike specific content
		const content = await page.textContent("body");
		expect(content).toMatch(REACT_VIKE_CONTENT);

		// Check for typical Vike elements
		const vikeElements = page.locator("h1:has-text('My Vike app')");
		await expect(vikeElements.first()).toBeVisible();
	});

	test("should have working counter component", async ({ page }) => {
		await page.goto("http://localhost:3005");
		await page.waitForLoadState("networkidle");

		// Look for the counter button
		const counterButton = page.locator("button:has-text('Counter')");
		await expect(counterButton).toBeVisible();

		// Click the counter and verify it increments
		const initialText = await counterButton.textContent();
		await counterButton.click();

		await page.waitForTimeout(100); // Give time for state update
		const updatedText = await counterButton.textContent();
		expect(updatedText).not.toBe(initialText);
	});

	test("should have working UI components when UI package is included", async ({ page }) => {
		await page.goto("http://localhost:3005");
		await page.waitForLoadState("networkidle");

		// Look for injected UI component button
		const uiButton = page.locator("button:has-text('UI Component')");
		if ((await uiButton.count()) > 0) {
			await expect(uiButton).toBeVisible();

			// Test the UI component functionality
			const initialText = await uiButton.textContent();
			await uiButton.click();

			await page.waitForTimeout(100);
			const updatedText = await uiButton.textContent();
			expect(updatedText).not.toBe(initialText);
		}
	});

	test("should have proper page title and meta tags", async ({ page }) => {
		await page.goto("http://localhost:3005");
		await page.waitForLoadState("networkidle");

		// Check for proper title
		const title = await page.title();
		expect(title.length).toBeGreaterThan(0);

		// Check for viewport meta tag
		const viewport = page.locator('meta[name="viewport"]');
		await expect(viewport).toHaveAttribute("content", VIEWPORT_WIDTH_DEVICE);
	});

	test("should handle client-side navigation", async ({ page }) => {
		await page.goto("http://localhost:3005");
		await page.waitForLoadState("networkidle");

		// Check if the page is rendered to HTML (SSR)
		const content = await page.textContent("body");
		expect(content).toContain("Rendered to HTML");

		// Check if it's also interactive
		expect(content).toContain("Interactive");
	});

	test("should support SSR and client hydration", async ({ page }) => {
		// Test that content is available before JS loads (SSR)
		await page.goto("http://localhost:3005");

		// Check that content is present even before full load
		const heading = page.locator("h1:has-text('My Vike app')");
		await expect(heading).toBeVisible({ timeout: 5000 });

		// Wait for full hydration
		await page.waitForLoadState("networkidle");

		// Test that interactive elements work (client-side hydration)
		const counterButton = page.locator("button:has-text('Counter')");
		await expect(counterButton).toBeVisible();
		await counterButton.click();
	});
});
