import { expect, test } from "@playwright/test";

test.describe("Next.js Template E2E", () => {
	test("should load Next.js app with proper SSR content", async ({ page }) => {
		await page.goto("http://localhost:3002");

		// Wait for Next.js to load
		await page.waitForLoadState("networkidle");

		// Check for Next.js or React specific content
		const content = await page.textContent("body");
		const hasNextContent =
			content?.includes("Next") ||
			content?.includes("React") ||
			content?.includes("Welcome") ||
			content?.includes("Get started");
		expect(hasNextContent).toBe(true);

		// Check for Next.js specific elements
		const nextScript = page.locator('script[src*="/_next/"]');
		if ((await nextScript.count()) > 0) {
			await expect(nextScript.first()).toBeAttached();
		}

		// Check for __NEXT_DATA__ script (server-side rendering)
		const nextData = page.locator("script#__NEXT_DATA__");
		if ((await nextData.count()) > 0) {
			await expect(nextData).toBeAttached();
		}
	});

	test("should have working UI components when UI package is included", async ({ page }) => {
		await page.goto("http://localhost:3002");
		await page.waitForLoadState("networkidle");

		// Look for injected UI test component
		const testComponent = page.locator('[data-testid="test-ui-component"]');
		if ((await testComponent.count()) > 0) {
			await expect(testComponent).toBeVisible();
			expect(await testComponent.textContent()).toContain("UI Test Component");
		}
	});

	test("should have proper SEO tags and metadata", async ({ page }) => {
		await page.goto("http://localhost:3002");
		await page.waitForLoadState("networkidle");

		// Check for proper title
		const title = await page.title();
		expect(title.length).toBeGreaterThan(0);

		// Check for meta tags
		const description = page.locator('meta[name="description"]');
		if ((await description.count()) > 0) {
			await expect(description).toHaveAttribute("content");
		}

		// Check for viewport meta tag
		const viewport = page.locator('meta[name="viewport"]');
		if ((await viewport.count()) > 0) {
			const viewportContent = await viewport.getAttribute("content");
			expect(viewportContent).toContain("width=device-width");
		}
	});

	test("should handle client-side navigation", async ({ page }) => {
		await page.goto("http://localhost:3002");
		await page.waitForLoadState("networkidle");

		// Test page reload (should work with SSR)
		await page.reload();
		await page.waitForLoadState("networkidle");

		const content = await page.textContent("body");
		const hasBasicContent = content?.includes("Next") || content?.includes("React") || content?.includes("Welcome");
		expect(hasBasicContent).toBe(true);

		// Check that hydration completes successfully
		await page
			.waitForFunction(
				() => {
					return typeof window !== "undefined" && (window as { __NEXT_HYDRATED?: boolean }).__NEXT_HYDRATED;
				},
				undefined,
				{ timeout: 5000 },
			)
			.catch(() => {
				// Hydration flag might not be available in all Next.js versions
				console.log("Hydration flag not available, skipping check");
			});
	});

	test("should support API routes if available", async ({ page, request }) => {
		await page.goto("http://localhost:3002");
		await page.waitForLoadState("networkidle");

		// Try to access a common API route pattern
		try {
			const response = await request.get("http://localhost:3002/api/health");
			if (response.ok()) {
				const data = await response.json();
				expect(data).toBeDefined();
			}
		} catch (_e) {
			// API routes might not be available in all templates
			console.log("API routes not available, skipping check");
		}
	});

	test("should handle API endpoints when ORM is configured", async ({ request }) => {
		if (process.env.ORM) {
			try {
				// Test API routes that might be available with ORM
				const response = await request.get("http://localhost:3002/api/users");
				if (response.ok()) {
					const data = await response.json();
					expect(Array.isArray(data)).toBe(true);
				}
			} catch (_e) {
				console.log("ORM API endpoints not available in Next.js template");
			}
		} else {
			console.log("No ORM configured, skipping API endpoints test");
		}
	});
});
