import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { OrmConfig } from "../types";

// Regular expressions for ORM endpoint injection
const IMPORT_LINE_REGEX = /^import\s+.*$/gm;
const AFTER_IMPORT_EXPRESS_REGEX = /import cors from "cors";/;
const LAST_IMPORT_REGEX = /(import\s+.*?;\s*\n)(?!import)/s;
const EXPRESS_LISTEN_REGEX = /app\.listen\(/;
const HONO_EXPORT_REGEX = /export default/;

/**
 * Add ORM endpoints to backend framework apps
 */
export async function addOrmEndpoints(appPath: string, framework: string, orm: OrmConfig): Promise<void> {
	const indexPath = join(appPath, "src", "index.ts");

	// Check if the index.ts file exists before trying to read it
	try {
		await access(indexPath);
	} catch {
		// File doesn't exist - this is expected for frameworks like Next.js that don't have src/index.ts
		return;
	}

	// Get the project name from the app path (e.g., /path/to/project/apps/myapp -> project)
	const pathParts = appPath.split("/");
	const appsIndex = pathParts.findIndex((part) => part === "apps");
	const projectName = appsIndex > 0 ? pathParts[appsIndex - 1]! : "project";

	const indexContent = await readFile(indexPath, "utf-8");

	let updatedContent: string;

	if (framework === "express") {
		updatedContent = addExpressOrmEndpoints(indexContent, orm, projectName);
	} else if (framework === "hono") {
		updatedContent = addHonoOrmEndpoints(indexContent, orm, projectName);
	} else {
		// For other frameworks or future support
		return;
	}

	await writeFile(indexPath, updatedContent);
}

/**
 * Add ORM endpoints to Express apps
 */
function addExpressOrmEndpoints(content: string, orm: OrmConfig, projectName: string): string {
	const importPrefixStatement =
		orm.type === "drizzle"
			? `import { db, type NewUser, users } from "@${projectName}/db";\n`
			: `import { db } from "@${projectName}/db";\n`;
	const importAfterCorsImportStatement = orm.type === "drizzle" ? `\nimport { eq } from "drizzle-orm";\n` : "";

	const userRoutes =
		orm.type === "drizzle"
			? `// ORM Test endpoint
app.get("/orm-test", (_req, res) => {
	res.json({ message: "orm-test-endpoint", orm: "drizzle" });
});

// User routes
app.get("/api/users", async (_req, res) => {
	try {
		const allUsers = await db.select().from(users);
		res.json(allUsers);
	} catch (_error) {
		res.status(500).json({ error: "Failed to fetch users" });
	}
});

app.post("/api/users", async (req, res) => {
	try {
		const newUser: NewUser = req.body;
		const user = await db.insert(users).values(newUser).returning();
		res.status(201).json(user[0]);
	} catch (_error) {
		res.status(500).json({ error: "Failed to create user" });
	}
});

app.get("/api/users/:id", async (req, res) => {
	try {
		const user = await db.select().from(users).where(eq(users.id, req.params.id));
		if (user.length === 0) {
			return res.status(404).json({ error: "User not found" });
		}
		res.json(user[0]);
	} catch (_error) {
		res.status(500).json({ error: "Failed to fetch user" });
	}
});`
			: `// ORM Test endpoint
app.get("/orm-test", (_req, res) => {
	res.json({ message: "orm-test-endpoint", orm: "prisma" });
});

// User routes
app.get("/api/users", async (_req, res) => {
	try {
		const users = await db.user.findMany();
		res.json(users);
	} catch (_error) {
		res.status(500).json({ error: "Failed to fetch users" });
	}
});

app.post("/api/users", async (req, res) => {
	try {
		const user = await db.user.create({ data: req.body });
		res.status(201).json(user);
	} catch (_error) {
		res.status(500).json({ error: "Failed to create user" });
	}
});

app.get("/api/users/:id", async (req, res) => {
	try {
		const user = await db.user.findUnique({ where: { id: req.params.id } });
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		res.json(user);
	} catch (_error) {
		res.status(500).json({ error: "Failed to fetch user" });
	}
});`;

	// Add imports at the top (eq import is already included in importStatement for drizzle)
	const withImports = content
		.replace("", importPrefixStatement ? `${importPrefixStatement}\n` : "")
		.replace(AFTER_IMPORT_EXPRESS_REGEX, (match) => `${match}${importAfterCorsImportStatement}`);

	// Add routes before the server start
	return withImports.replace(
		EXPRESS_LISTEN_REGEX,
		`${userRoutes}
app.listen(`,
	);
}

/**
 * Add ORM endpoints to Hono apps
 */
function addHonoOrmEndpoints(content: string, orm: OrmConfig, projectName: string): string {
	const importPrefixStatement =
		orm.type === "drizzle"
			? `import { db, type NewUser, users } from "@${projectName}/db";\nimport { eq } from "drizzle-orm";\n`
			: `import { db } from "@${projectName}/db";\n`;

	const userRoutes =
		orm.type === "drizzle"
			? `// ORM Test endpoint
app.get("/orm-test", (c) => {
	return c.json({ message: "orm-test-endpoint", orm: "drizzle" });
});

// User routes
app.get("/api/users", async (c) => {
	try {
		const allUsers = await db.select().from(users);
		return c.json(allUsers);
	} catch (_error) {
		return c.json({ error: "Failed to fetch users" }, 500);
	}
});

app.post("/api/users", async (c) => {
	try {
		const newUser: NewUser = await c.req.json();
		const user = await db.insert(users).values(newUser).returning();
		return c.json(user[0], 201);
	} catch (_error) {
		return c.json({ error: "Failed to create user" }, 500);
	}
});

app.get("/api/users/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const user = await db.select().from(users).where(eq(users.id, id));
		if (user.length === 0) {
			return c.json({ error: "User not found" }, 404);
		}
		return c.json(user[0]);
	} catch (_error) {
		return c.json({ error: "Failed to fetch user" }, 500);
	}
});`
			: `// ORM Test endpoint
app.get("/orm-test", (c) => {
	return c.json({ message: "orm-test-endpoint", orm: "prisma" });
});

// User routes
app.get("/api/users", async (c) => {
	try {
		const users = await db.user.findMany();
		return c.json(users);
	} catch (_error) {
		return c.json({ error: "Failed to fetch users" }, 500);
	}
});

app.post("/api/users", async (c) => {
	try {
		const userData = await c.req.json();
		const user = await db.user.create({ data: userData });
		return c.json(user, 201);
	} catch (_error) {
		return c.json({ error: "Failed to create user" }, 500);
	}
});

app.get("/api/users/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const user = await db.user.findUnique({ where: { id } });
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}
		return c.json(user);
	} catch (_error) {
		return c.json({ error: "Failed to fetch user" }, 500);
	}
});`;

	// Add imports at the top (eq import is already included in importStatement for drizzle)
	const withImports = content
		.replace(IMPORT_LINE_REGEX, (match) => match)
		.replace(LAST_IMPORT_REGEX, `${importPrefixStatement}$1`);

	// Add routes before the export default
	return withImports.replace(
		HONO_EXPORT_REGEX,
		`${userRoutes}

export default`,
	);
}
