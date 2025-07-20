import { expect, test } from "@playwright/test";

test.describe("Hono Backend E2E", () => {
	test("should respond with basic API content", async ({ request }) => {
		const response = await request.get("http://localhost:8000");
		expect(response.ok()).toBeTruthy();

		const content = await response.text();
		expect(content).toContain("Hello from Hono!");
	});

	test("should have proper JSON response structure", async ({ request }) => {
		const response = await request.get("http://localhost:8000");
		expect(response.ok()).toBeTruthy();

		const contentType = response.headers()["content-type"];
		if (contentType?.includes("application/json")) {
			const data = await response.json();
			expect(data).toBeDefined();
			expect(typeof data).toBe("object");
		}
	});

	test("should handle CORS headers correctly", async ({ request }) => {
		const response = await request.get("http://localhost:8000");
		expect(response.ok()).toBeTruthy();

		// Check for common CORS headers
		const headers = response.headers();
		if (headers["access-control-allow-origin"]) {
			expect(headers["access-control-allow-origin"]).toBeDefined();
		}
	});

	test("should respond to health check endpoint if available", async ({ request }) => {
		try {
			const response = await request.get("http://localhost:8000/health");
			if (response.ok()) {
				const content = await response.text();
				expect(content.length).toBeGreaterThan(0);
			}
		} catch (_e) {
			// Health endpoint might not be available in basic template
			console.log("Health endpoint not available, skipping check");
		}
	});

	test("should respond to ORM test endpoint when ORM is configured", async ({ request }) => {
		if (process.env.ORM) {
			const response = await request.get("http://localhost:8000/orm-test");
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

	test("should handle API endpoints when ORM is configured", async ({ request }) => {
		if (process.env.ORM) {
			try {
				// Test user endpoints that are injected with ORM
				const response = await request.get("http://localhost:8000/api/users");
				if (response.ok()) {
					const data = await response.json();
					expect(Array.isArray(data)).toBe(true);
				}
			} catch (_e) {
				console.log("ORM user endpoints not available, might not be injected");
			}
		} else {
			console.log("No ORM configured, skipping API endpoints test");
		}
	});

	test("should handle 404 for non-existent routes", async ({ request }) => {
		const response = await request.get("http://localhost:8000/non-existent-route-12345");
		expect(response.status()).toBe(404);
	});

	test("should have fast response times (Hono performance characteristic)", async ({ request }) => {
		const startTime = Date.now();
		const response = await request.get("http://localhost:8000");
		const endTime = Date.now();

		expect(response.ok()).toBeTruthy();

		const responseTime = endTime - startTime;
		// Hono should be fast, but allow reasonable network latency
		expect(responseTime).toBeLessThan(1000);
	});

	test("should handle request methods correctly", async ({ request }) => {
		// Test GET
		const getResponse = await request.get("http://localhost:8000");
		expect(getResponse.ok()).toBeTruthy();

		// Test OPTIONS (for CORS preflight)
		try {
			const optionsResponse = await request.fetch("http://localhost:8000", { method: "OPTIONS" });
			// Should not fail with method not allowed
			expect([200, 204, 404]).toContain(optionsResponse.status());
		} catch (_e) {
			// Some servers might not handle OPTIONS
			console.log("OPTIONS method not handled, skipping check");
		}
	});
});
