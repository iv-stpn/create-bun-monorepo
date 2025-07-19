import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

const app = new Hono();

// Middleware
app.use(logger());
app.use(prettyJSON());
app.use(cors());

// Routes
app.get("/", (c) => {
	return c.json({
		message: "Hello from Hono!",
		timestamp: new Date().toISOString(),
		version: "1.0.0",
	});
});

app.get("/health", (c) => {
	return c.json({
		status: "ok",
		service: "hono",
		timestamp: new Date().toISOString(),
	});
});

app.get("/api/users", (c) => {
	return c.json({
		users: [
			{ id: 1, name: "John Doe", email: "john@example.com" },
			{ id: 2, name: "Jane Smith", email: "jane@example.com" },
		],
	});
});

app.post("/api/users", async (c) => {
	const body = await c.req.json();

	// Basic validation
	if (!body.name || !body.email) {
		return c.json({ error: "Name and email are required" }, 400);
	}

	return c.json(
		{
			message: "User created successfully",
			user: {
				id: Date.now(),
				name: body.name,
				email: body.email,
			},
		},
		201,
	);
});

const port = process.env.PORT || 8000;
console.log(`🔥 Hono is running on port ${port}`);

export default {
	port,
	fetch: app.fetch,
};
