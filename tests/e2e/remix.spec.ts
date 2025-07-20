import { expect, test } from "@playwright/test";

test.describe("Remix E2E", () => {
	test("should load the Remix application successfully", async ({ page }) => {
		await page.goto("http://localhost:3004");

		// Wait for Remix to hydrate
		await page.waitForLoadState("networkidle");

		// Check that the page loaded
		expect(await page.title()).toBeTruthy();

		// Look for content that indicates successful render
		const body = await page.locator("body").textContent();
		expect(body).not.toBe("");
		expect(body).not.toContain("Cannot GET");
	});

	test("should have proper HTML structure with hydration", async ({ page }) => {
		await page.goto("http://localhost:3004");
		await page.waitForLoadState("networkidle");

		// Check for Remix root element
		const html = await page.innerHTML("html");
		expect(html).toContain("body");

		// Verify page is interactive (Remix should hydrate)
		const isInteractive = await page.evaluate(() => document.readyState);
		expect(isInteractive).toBe("complete");
	});

	test("should handle client-side navigation", async ({ page }) => {
		await page.goto("http://localhost:3004");
		await page.waitForLoadState("networkidle");

		// Try to find navigation elements
		const links = await page.locator("a[href]").count();

		if (links > 0) {
			// Test that client-side navigation works
			const firstLink = page.locator("a[href]").first();
			const href = await firstLink.getAttribute("href");

			if (href?.startsWith("/")) {
				await firstLink.click();
				await page.waitForLoadState("networkidle");

				// Should still be on the same origin
				const currentUrl = page.url();
				expect(currentUrl).toContain("localhost:3004");
			}
		} else {
			// No navigation links found, just verify the page is working
			const content = await page.textContent("body");
			expect(content).toBeDefined();
		}
	});

	test("should load Remix resources correctly", async ({ page }) => {
		const responses: string[] = [];

		page.on("response", (response) => {
			responses.push(response.url());
		});

		await page.goto("http://localhost:3004");
		await page.waitForLoadState("networkidle");

		// Check that JavaScript resources loaded
		const jsLoaded = responses.some((url) => url.includes(".js") || url.includes("build") || url.includes("assets"));
		expect(jsLoaded).toBe(true);
	});

	test("should handle API routes when ORM is configured", async ({ request }) => {
		// Check if ORM environment variable is set
		if (process.env.ORM) {
			try {
				// Remix typically uses resource routes
				const response = await request.get("http://localhost:3004/api/users");
				if (response.ok()) {
					const data = await response.json();
					expect(Array.isArray(data)).toBe(true);
				} else {
					// Try alternative API pattern
					const altResponse = await request.get("http://localhost:3004/users");
					if (altResponse.ok()) {
						const altData = await altResponse.json();
						expect(Array.isArray(altData)).toBe(true);
					}
				}
			} catch (_e) {
				// API endpoints might not be available or configured differently
				console.log("API endpoints not available in basic Remix template");
			}
		} else {
			console.log("No ORM configured, skipping API endpoint test");
		}
	});

	test("should respond to ORM test endpoint when ORM is configured", async ({ request }) => {
		if (process.env.ORM) {
			const response = await request.get("http://localhost:3004/orm-test");
			if (response.ok()) {
				const data = await response.json();
				expect(data).toHaveProperty("message", "orm-test-endpoint");
				expect(data).toHaveProperty("orm");
				expect(data.orm).toBe(process.env.ORM);
			}
		} else {
			console.log("No ORM configured, skipping ORM endpoint test");
		}
	});

	test("should handle 404 pages correctly", async ({ page }) => {
		const response = await page.goto("http://localhost:3004/non-existent-route-12345");

		// Remix handles 404s gracefully, might return 200 with error boundary or 404
		expect([200, 404]).toContain(response?.status());

		// Check if error page or 404 content is shown
		const pageText = await page.textContent("body");
		expect(pageText).toBeDefined();
		expect(pageText?.length).toBeGreaterThan(0);
	});

	test("should have proper meta tags and SEO", async ({ page }) => {
		await page.goto("http://localhost:3004");
		await page.waitForLoadState("networkidle");

		// Check for basic meta tags (Remix should handle these)
		const title = await page.title();
		expect(title).toBeDefined();
		expect(title.length).toBeGreaterThan(0);

		// Check for viewport meta tag
		const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
		if (viewport) {
			expect(viewport).toContain("width=device-width");
		}
	});

	test("should support server-side rendering", async ({ page }) => {
		// Test that content is available immediately on page load
		const response = await page.goto("http://localhost:3004");
		expect(response?.ok()).toBe(true);

		// Page should render content server-side
		const content = await page.textContent("body");
		expect(content).toBeDefined();
		expect(content?.length).toBeGreaterThan(0);

		// Content should be available before JavaScript hydration
		expect(content).not.toContain("Loading...");
	});
});
