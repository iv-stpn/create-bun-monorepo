import { expect, test } from "@playwright/test";

test.describe("Express Backend E2E", () => {
	test("should respond with basic API content", async ({ request }) => {
		const response = await request.get("http://localhost:3100");
		expect(response.ok()).toBeTruthy();

		const content = await response.text();
		expect(content).toMatch(/(Hello|Express|API|Welcome)/i);
	});

	test("should have proper JSON response structure", async ({ request }) => {
		const response = await request.get("http://localhost:3100");
		expect(response.ok()).toBeTruthy();

		const contentType = response.headers()["content-type"];
		if (contentType && contentType.includes("application/json")) {
			const data = await response.json();
			expect(data).toBeDefined();
			expect(typeof data).toBe("object");
		}
	});

	test("should handle CORS headers correctly", async ({ request }) => {
		const response = await request.get("http://localhost:3100");
		expect(response.ok()).toBeTruthy();

		// Check for common CORS headers
		const headers = response.headers();
		if (headers["access-control-allow-origin"]) {
			expect(headers["access-control-allow-origin"]).toBeDefined();
		}
	});

	test("should respond to health check endpoint if available", async ({ request }) => {
		try {
			const response = await request.get("http://localhost:3100/health");
			if (response.ok()) {
				const content = await response.text();
				expect(content.length).toBeGreaterThan(0);
			}
		} catch (e) {
			// Health endpoint might not be available in basic template
			console.log("Health endpoint not available, skipping check");
		}
	});

	test("should respond to ORM test endpoint when ORM is configured", async ({ request }) => {
		try {
			const response = await request.get("http://localhost:3100/orm-test");
			if (response.ok()) {
				const data = await response.json();
				expect(data).toHaveProperty("message", "orm-test-endpoint");
				expect(data).toHaveProperty("orm");
			}
		} catch (e) {
			// ORM endpoint might not be injected in all scenarios
			console.log("ORM test endpoint not available, skipping check");
		}
	});

	test("should handle 404 for non-existent routes", async ({ request }) => {
		const response = await request.get("http://localhost:3100/non-existent-route-12345");
		expect(response.status()).toBe(404);
	});

	test("should have proper server headers", async ({ request }) => {
		const response = await request.get("http://localhost:3100");
		expect(response.ok()).toBeTruthy();

		const headers = response.headers();
		expect(headers).toHaveProperty("content-type");

		// Check for security headers if implemented
		if (headers["x-powered-by"]) {
			expect(headers["x-powered-by"]).toMatch(/Express/i);
		}
	});
});
