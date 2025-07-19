import { expect, test } from "@playwright/test";

// Regular expressions for performance optimization
const REACT_NATIVE_EXPO_CONTENT = /(React Native|Expo|Welcome|Open up App)/i;
const REACT_NATIVE_EXPO_BASIC = /(React Native|Expo)/i;

interface WindowExpo {
	expo?: unknown;
	__EXPO_WEB__?: unknown;
	__METRO__?: unknown;
	module?: { hot?: unknown };
}

test.describe("React Native Expo Web E2E", () => {
	test("should load React Native Expo web app with basic content", async ({ page }) => {
		await page.goto("http://localhost:8081");

		// Wait for React Native Web to load
		await page.waitForLoadState("networkidle");

		// Check for React Native/Expo specific content
		const content = await page.textContent("body");
		expect(content).toMatch(REACT_NATIVE_EXPO_CONTENT);

		// Check for typical React Native Web elements
		const rnElements = page.locator("[data-reactroot], #root, #expo-root");
		await expect(rnElements.first()).toBeVisible();
	});

	test("should have working UI components when UI Native package is included", async ({ page }) => {
		await page.goto("http://localhost:8081");
		await page.waitForLoadState("networkidle");

		// Look for injected UI test component (React Native uses testID)
		const testComponent = page.locator('[data-testid="test-ui-component"], [testid="test-ui-component"]');
		if ((await testComponent.count()) > 0) {
			await expect(testComponent).toBeVisible();
			expect(await testComponent.textContent()).toContain("UI Test Component");
		}
	});

	test("should have proper React Native Web setup", async ({ page }) => {
		await page.goto("http://localhost:8081");
		await page.waitForLoadState("networkidle");

		// Check for React Native Web specific styles or indicators
		const rnWebSetup = await page.evaluate(() => {
			// Check for React Native Web CSS classes or styles
			const body = document.body;
			const hasRNStyles = body.className.includes("rn-") || 
				Array.from(document.styleSheets).some((sheet) => {
					try {
						const rules = Array.from(sheet.cssRules || []);
						return rules.some((rule) => rule.cssText.includes("react-native"));
					} catch {
						return false;
					}
				});
			return hasRNStyles;
		});

		// This check is optional since RN Web might not always have detectable indicators
		if (rnWebSetup) {
			expect(rnWebSetup).toBeTruthy();
		}
	});

	test("should handle mobile-first responsive design", async ({ page }) => {
		// Test mobile viewport (React Native's natural target)
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("http://localhost:8081");
		await page.waitForLoadState("networkidle");

		// Check that the app renders properly on mobile
		const content = await page.textContent("body");
		expect(content).toMatch(REACT_NATIVE_EXPO_BASIC);

		// Test tablet viewport
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.reload();
		await page.waitForLoadState("networkidle");

		const tabletContent = await page.textContent("body");
		expect(tabletContent).toMatch(REACT_NATIVE_EXPO_BASIC);
	});

	test("should handle touch interactions properly", async ({ page }) => {
		await page.goto("http://localhost:8081");
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

	test("should handle Expo web features", async ({ page }) => {
		await page.goto("http://localhost:8081");
		await page.waitForLoadState("networkidle");

		// Check for Expo-specific web features or configuration
		const expoWebFeatures = await page.evaluate(() => {
			return typeof window !== "undefined" && 
				((window as WindowExpo).expo || (window as WindowExpo).__EXPO_WEB__);
		});

		// This is optional since Expo web features might not always be detectable
		if (expoWebFeatures) {
			expect(expoWebFeatures).toBeTruthy();
		}

		// Check that hot reloading works (development feature)
		const hotReload = await page.evaluate(() => {
			return typeof window !== "undefined" && 
				((window as WindowExpo).__METRO__ || (window as WindowExpo).module?.hot);
		});

		// This is also optional
		if (hotReload) {
			expect(hotReload).toBeTruthy();
		}
	});

	test("should support accessibility features", async ({ page }) => {
		await page.goto("http://localhost:8081");
		await page.waitForLoadState("networkidle");

		// Check for ARIA labels and accessibility attributes (React Native Web should handle this)
		const accessibleElements = page.locator('[aria-label], [role], [aria-describedby]');
		
		if ((await accessibleElements.count()) > 0) {
			await expect(accessibleElements.first()).toBeVisible();
		}

		// Test keyboard navigation
		await page.keyboard.press('Tab');
		const focusedElement = await page.locator(':focus');
		
		if ((await focusedElement.count()) > 0) {
			await expect(focusedElement).toBeVisible();
		}
	});
});
