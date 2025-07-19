import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { OrmConfig } from "../types";

// Regular expressions for ORM endpoint injection
const IMPORT_LINE_REGEX = /^import\s+.*$/gm;
const LAST_IMPORT_REGEX = /(import\s+.*?;\s*\n)(?!import)/s;
const EXPRESS_LISTEN_REGEX = /app\.listen\(/;
const HONO_EXPORT_REGEX = /export default/;

/**
 * Add ORM endpoints to backend framework apps
 */
export async function addOrmEndpoints(appPath: string, framework: string, orm: OrmConfig): Promise<void> {
	const indexPath = join(appPath, "src", "index.ts");
	const indexContent = await readFile(indexPath, "utf-8");

	let updatedContent: string;

	if (framework === "express") {
		updatedContent = addExpressOrmEndpoints(indexContent, orm);
	} else if (framework === "hono") {
		updatedContent = addHonoOrmEndpoints(indexContent, orm);
	} else {
		// For other frameworks or future support
		return;
	}

	await writeFile(indexPath, updatedContent);
}

/**
 * Add ORM endpoints to Express apps
 */
function addExpressOrmEndpoints(content: string, orm: OrmConfig): string {
	const importStatement =
		orm.type === "drizzle"
			? `import { db } from '../../../src/lib/db';\nimport { users, type User, type NewUser } from '../../../src/lib/schema';`
			: `import { db } from '../../../src/lib/db';`;

	const userRoutes =
		orm.type === "drizzle"
			? `
// User routes
app.get("/api/users", async (_req, res) => {
	try {
		const allUsers = await db.select().from(users);
		res.json(allUsers);
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch users" });
	}
});

app.post("/api/users", async (req, res) => {
	try {
		const newUser: NewUser = req.body;
		const user = await db.insert(users).values(newUser).returning();
		res.status(201).json(user[0]);
	} catch (error) {
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
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch user" });
	}
});`
			: `
// User routes
app.get("/api/users", async (_req, res) => {
	try {
		const users = await db.user.findMany();
		res.json(users);
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch users" });
	}
});

app.post("/api/users", async (req, res) => {
	try {
		const user = await db.user.create({ data: req.body });
		res.status(201).json(user);
	} catch (error) {
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
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch user" });
	}
});`;

	const eqImport = orm.type === "drizzle" ? "import { eq } from 'drizzle-orm';\n" : "";

	// Add imports at the top
	const withImports = content
		.replace(IMPORT_LINE_REGEX, (match) => match)
		.replace(LAST_IMPORT_REGEX, `$1${eqImport}${importStatement}\n\n`);

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
function addHonoOrmEndpoints(content: string, orm: OrmConfig): string {
	const importStatement =
		orm.type === "drizzle"
			? `import { db } from '../../../src/lib/db';\nimport { users, type User, type NewUser } from '../../../src/lib/schema';`
			: `import { db } from '../../../src/lib/db';`;

	const userRoutes =
		orm.type === "drizzle"
			? `
// User routes
app.get("/api/users", async (c) => {
	try {
		const allUsers = await db.select().from(users);
		return c.json(allUsers);
	} catch (error) {
		return c.json({ error: "Failed to fetch users" }, 500);
	}
});

app.post("/api/users", async (c) => {
	try {
		const newUser: NewUser = await c.req.json();
		const user = await db.insert(users).values(newUser).returning();
		return c.json(user[0], 201);
	} catch (error) {
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
	} catch (error) {
		return c.json({ error: "Failed to fetch user" }, 500);
	}
});`
			: `
// User routes
app.get("/api/users", async (c) => {
	try {
		const users = await db.user.findMany();
		return c.json(users);
	} catch (error) {
		return c.json({ error: "Failed to fetch users" }, 500);
	}
});

app.post("/api/users", async (c) => {
	try {
		const userData = await c.req.json();
		const user = await db.user.create({ data: userData });
		return c.json(user, 201);
	} catch (error) {
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
	} catch (error) {
		return c.json({ error: "Failed to fetch user" }, 500);
	}
});`;

	const eqImport = orm.type === "drizzle" ? "import { eq } from 'drizzle-orm';\n" : "";

	// Add imports at the top
	const withImports = content
		.replace(IMPORT_LINE_REGEX, (match) => match)
		.replace(LAST_IMPORT_REGEX, `$1${eqImport}${importStatement}\n\n`);

	// Add routes before the export default
	return withImports.replace(
		HONO_EXPORT_REGEX,
		`${userRoutes}

export default`,
	);
}
