import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

const app = express();
const port = process.env.PORT || 3100;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (_req, res) => {
	res.json({
		message: "Hello from Express!",
		timestamp: new Date().toISOString(),
		version: "1.0.0",
	});
});

app.get("/health", (_req, res) => {
	res.json({
		status: "ok",
		service: "express",
		timestamp: new Date().toISOString(),
	});
});

app.get("/api/users", (_req, res) => {
	res.json({
		users: [
			{ id: 1, name: "John Doe", email: "john@example.com" },
			{ id: 2, name: "Jane Smith", email: "jane@example.com" },
		],
	});
});

app.post("/api/users", (req, res) => {
	const { name, email } = req.body;

	// Basic validation
	if (!name || !email) {
		return res.status(400).json({ error: "Name and email are required" });
	}

	res.status(201).json({
		message: "User created successfully",
		user: {
			id: Date.now(),
			name,
			email,
		},
	});
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	console.error(err.stack);
	res.status(500).json({ error: "Something went wrong!" });
});

app.listen(port, () => {
	console.log(`🚀 Express is running on port ${port}`);
});
