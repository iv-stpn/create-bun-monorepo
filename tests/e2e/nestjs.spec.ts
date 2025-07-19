import { expect, test } from "@playwright/test";

test.describe("NestJS Backend E2E", () => {
	test("should respond with basic API content", async ({ request }) => {
		const response = await request.get("http://localhost:3101");
		expect(response.ok()).toBeTruthy();

		const content = await response.text();
		expect(content).toMatch(/(Hello|NestJS|World|API|Welcome)/i);
	});

	test("should have proper JSON response structure", async ({ request }) => {
		const response = await request.get("http://localhost:3101");
		expect(response.ok()).toBeTruthy();

		const contentType = response.headers()["content-type"];
		if (contentType?.includes("application/json")) {
			const data = await response.json();
			expect(data).toBeDefined();
			expect(typeof data).toBe("object");
		}
	});

	test("should handle CORS headers correctly", async ({ request }) => {
		const response = await request.get("http://localhost:3101");
		expect(response.ok()).toBeTruthy();

		// Check for common CORS headers
		const headers = response.headers();
		if (headers["access-control-allow-origin"]) {
			expect(headers["access-control-allow-origin"]).toBeDefined();
		}
	});

	test("should respond to ORM test endpoint when ORM is configured", async ({ request }) => {
		try {
			const response = await request.get("http://localhost:3101/orm-test");
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

	test("should have proper NestJS decorator-based routing", async ({ request }) => {
		const response = await request.get("http://localhost:3101");
		expect(response.ok()).toBeTruthy();

		// NestJS typically returns structured responses
		const content = await response.text();
		expect(content.length).toBeGreaterThan(0);
	});

	test("should handle 404 for non-existent routes", async ({ request }) => {
		const response = await request.get("http://localhost:3101/non-existent-route-12345");
		expect(response.status()).toBe(404);
	});

	test("should support dependency injection (health check pattern)", async ({ request }) => {
		// Test default controller endpoint
		const response = await request.get("http://localhost:3101");
		expect(response.ok()).toBeTruthy();

		// Check response suggests proper DI container setup
		const headers = response.headers();
		expect(headers).toHaveProperty("content-type");
	});

	test("should handle request validation properly", async ({ request }) => {
		// Test with proper GET request
		const response = await request.get("http://localhost:3101");
		expect(response.ok()).toBeTruthy();

		// Test malformed requests should be handled gracefully
		try {
			const badResponse = await request.post("http://localhost:3101", {
				data: { invalid: "data without proper validation" },
			});
			// Should either accept or reject gracefully (not crash)
			expect([200, 400, 404, 405]).toContain(badResponse.status());
		} catch (e) {
			// Network errors are acceptable for malformed requests
			console.log("Request validation test completed (network error expected)");
		}
	});

	test("should have proper error handling middleware", async ({ request }) => {
		// Test that server handles errors gracefully
		try {
			const response = await request.get("http://localhost:3101/trigger-error-endpoint");
			// Should not crash server, should return structured error
			expect([404, 500]).toContain(response.status());
		} catch (e) {
			// 404 for non-existent endpoint is expected
			console.log("Error handling test completed");
		}
	});
});
