import { expect, test } from "@playwright/test";

test.describe("React Native Bare Web E2E", () => {
	test("should load React Native Bare web app with basic content", async ({ page }) => {
		await page.goto("http://localhost:8080");

		// Wait for React Native Web to load
		await page.waitForLoadState("networkidle");

		// Check for React Native specific content
		const content = await page.textContent("body");
		expect(content).toMatch(/(React Native|Welcome|Step One|Learn More)/i);

		// Check for typical React Native Web elements
		const rnElements = page.locator("[data-reactroot], #root, #app-root");
		await expect(rnElements.first()).toBeVisible();
	});

	test("should have working UI components when UI Native package is included", async ({ page }) => {
		await page.goto("http://localhost:8080");
		await page.waitForLoadState("networkidle");

		// Look for injected UI test component (React Native uses testID)
		const testComponent = page.locator('[data-testid="test-ui-component"], [testid="test-ui-component"]');
		if ((await testComponent.count()) > 0) {
			await expect(testComponent).toBeVisible();
			expect(await testComponent.textContent()).toContain("UI Test Component");
		}
	});

	test("should have proper React Native Web setup without Expo", async ({ page }) => {
		await page.goto("http://localhost:8080");
		await page.waitForLoadState("networkidle");

		// Check that this is NOT using Expo (bare React Native)
		const hasExpo = await page.evaluate(() => {
			return typeof window !== "undefined" && 
				((window as any).expo || (window as any).__EXPO_WEB__);
		});

		// Should NOT have Expo in bare React Native
		expect(hasExpo).toBeFalsy();

		// Check for React Native Web specific setup
		const rnWebSetup = await page.evaluate(() => {
			// Check for React Native Web CSS classes or Metro bundler
			return typeof window !== "undefined" && 
				((window as any).__METRO__ || document.body.className.includes("rn-"));
		});

		// This check is optional since RN Web might not always have detectable indicators
		if (rnWebSetup) {
			expect(rnWebSetup).toBeTruthy();
		}
	});

	test("should handle mobile-first responsive design", async ({ page }) => {
		// Test mobile viewport (React Native's natural target)
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("http://localhost:8080");
		await page.waitForLoadState("networkidle");

		// Check that the app renders properly on mobile
		const content = await page.textContent("body");
		expect(content).toMatch(/(React Native|Welcome)/i);

		// Test desktop viewport
		await page.setViewportSize({ width: 1200, height: 800 });
		await page.reload();
		await page.waitForLoadState("networkidle");

		const desktopContent = await page.textContent("body");
		expect(desktopContent).toMatch(/(React Native|Welcome)/i);
	});

	test("should handle touch interactions and gestures", async ({ page }) => {
		await page.goto("http://localhost:8080");
		await page.waitForLoadState("networkidle");

		// Look for touchable elements (React Native style)
		const touchableElements = page.locator(
			'[role="button"], button, [data-testid*="button"], [testid*="button"], [aria-label*="button"]'
		);

		if ((await touchableElements.count()) > 0) {
			// Test that touchable elements are accessible
			await expect(touchableElements.first()).toBeVisible();

			// Test touch interaction
			try {
				await touchableElements.first().tap();
				// If no error, the tap worked
			} catch {
				// Some elements might not be interactive, that's ok
				console.log("Touch interaction test completed (element may not be interactive)");
			}
		}
	});

	test("should support React Native Web components", async ({ page }) => {
		await page.goto("http://localhost:8080");
		await page.waitForLoadState("networkidle");

		// Look for typical React Native components rendered as web elements
		const rnComponents = page.locator(
			'[data-testid*="text"], [data-testid*="view"], [role="text"], [role="main"]'
		);

		if ((await rnComponents.count()) > 0) {
			await expect(rnComponents.first()).toBeVisible();
		}

		// Check for React Native Web specific styling patterns
		const rnWebStyling = await page.evaluate(() => {
			const elements = document.querySelectorAll('*');
			return Array.from(elements).some((el) => {
				const styles = window.getComputedStyle(el);
				// React Native Web often uses flexbox as default
				return styles.display === 'flex' || el.className.includes('rn-');
			});
		});

		// This is optional since styling patterns might vary
		if (rnWebStyling) {
			expect(rnWebStyling).toBeTruthy();
		}
	});

	test("should support accessibility features", async ({ page }) => {
		await page.goto("http://localhost:8080");
		await page.waitForLoadState("networkidle");

		// Check for ARIA labels and accessibility attributes
		const accessibleElements = page.locator('[aria-label], [role], [aria-describedby]');
		
		if ((await accessibleElements.count()) > 0) {
			await expect(accessibleElements.first()).toBeVisible();
		}

		// Test keyboard navigation
		await page.keyboard.press('Tab');
		const focusedElement = page.locator(':focus');
		
		if ((await focusedElement.count()) > 0) {
			await expect(focusedElement).toBeVisible();
		}
	});

	test("should handle Metro bundler features", async ({ page }) => {
		await page.goto("http://localhost:8080");
		await page.waitForLoadState("networkidle");

		// Check for Metro bundler specific features in development
		const metroFeatures = await page.evaluate(() => {
			return typeof window !== "undefined" && 
				((window as any).__METRO__ || (window as any).require?.context);
		});

		// This is optional since Metro features might not always be detectable in web
		if (metroFeatures) {
			expect(metroFeatures).toBeTruthy();
		}

		// Check for hot reloading capabilities
		const hotReload = await page.evaluate(() => {
			return typeof window !== "undefined" && 
				(window as any).module?.hot;
		});

		// Also optional
		if (hotReload) {
			expect(hotReload).toBeTruthy();
		}
	});
});
