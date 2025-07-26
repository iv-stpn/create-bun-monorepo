/**
 * ORM (Object-Relational Mapping) utilities for database setup
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { OrmConfig, OrmType } from "../types";
import { writeJsonFile } from "../utils/file";

/**
 * Get ORM configuration based on user choice
 */
export function createOrmConfig(ormType: OrmType, database: "postgresql" | "mysql" | "sqlite"): OrmConfig {
	return {
		type: ormType,
		database,
	};
}

/**
 * Get dependencies for ORM setup
 */
export function getOrmDependencies(ormConfig: OrmConfig): {
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
} {
	const { type, database } = ormConfig;

	if (type === "none") {
		return { dependencies: {}, devDependencies: {} };
	}

	const dependencies: Record<string, string> = {};
	const devDependencies: Record<string, string> = {};

	if (type === "drizzle") {
		dependencies["drizzle-orm"] = "^0.44.0";
		devDependencies["drizzle-kit"] = "^0.31.0";

		// Database-specific drivers
		switch (database) {
			case "postgresql":
				dependencies.postgres = "^3.4.0";
				// Note: postgres package includes its own TypeScript definitions
				break;
			case "mysql":
				dependencies.mysql2 = "^3.6.0";
				break;
			case "sqlite":
				dependencies["better-sqlite3"] = "^9.0.0";
				devDependencies["@types/better-sqlite3"] = "^7.6.0";
				break;
		}
	} else if (type === "prisma") {
		dependencies["@prisma/client"] = "^5.0.0";
		devDependencies.prisma = "^5.0.0";
	}

	return { dependencies, devDependencies };
}

/**
 * Get ORM-specific scripts for package.json
 */
export function getOrmScripts(ormConfig: OrmConfig): Record<string, string> {
	const { type } = ormConfig;

	if (type === "none") {
		return {};
	}

	if (type === "drizzle") {
		return {
			"db:generate": "drizzle-kit generate --config=packages/db/drizzle.config.ts",
			"db:migrate": "drizzle-kit migrate --config=packages/db/drizzle.config.ts",
			"db:studio": "drizzle-kit studio --config=packages/db/drizzle.config.ts",
			"db:push": "drizzle-kit push --config=packages/db/drizzle.config.ts",
		};
	}

	if (type === "prisma") {
		return {
			"db:generate": "prisma generate --schema=packages/db/prisma/schema.prisma",
			"db:migrate": "prisma migrate dev --schema=packages/db/prisma/schema.prisma",
			"db:studio": "prisma studio --schema=packages/db/prisma/schema.prisma",
			"db:push": "prisma db push --schema=packages/db/prisma/schema.prisma",
			"db:reset": "prisma migrate reset --schema=packages/db/prisma/schema.prisma",
			"db:seed": "bun run packages/db/src/seed.ts",
		};
	}

	return {};
}

/**
 * Create ORM setup files
 */
export async function createOrmSetup(rootPath: string, orm: OrmConfig): Promise<void> {
	const { type, database } = orm;

	if (type === "drizzle") {
		await createDrizzleSetup(rootPath, database);
	} else if (type === "prisma") {
		await createPrismaSetup(rootPath, database);
	}
}

/**
 * Create Drizzle ORM setup files in the db package
 */
async function createDrizzleSetup(rootPath: string, database: "postgresql" | "mysql" | "sqlite"): Promise<void> {
	// Create db package directory
	const dbPackagePath = join(rootPath, "packages", "db");
	await mkdir(join(dbPackagePath, "src"), { recursive: true });

	// Update package.json with Drizzle dependencies
	await updateDbPackageJson(dbPackagePath, "drizzle", database);

	// Create database connection file
	const dbContent = getDrizzleDbContent(database);
	await writeFile(join(dbPackagePath, "src", "client.ts"), dbContent, { encoding: "utf-8" });

	// Create schema file with User model
	const schemaContent = getDrizzleSchemaContent(database);
	await writeFile(join(dbPackagePath, "src", "schema.ts"), schemaContent, { encoding: "utf-8" });

	// Update index.ts to export everything
	const indexContent = `export * from "./client";
export * from "./schema";
`;

	await writeFile(join(dbPackagePath, "src", "index.ts"), indexContent, { encoding: "utf-8" });

	// Create Drizzle config
	const configContent = getDrizzleConfigContent(database);
	await writeFile(join(dbPackagePath, "drizzle.config.ts"), configContent, { encoding: "utf-8" });

	// Create environment file
	const envContent = getDrizzleEnvContent(database);
	await writeFile(join(rootPath, ".env.example"), envContent, { encoding: "utf-8" });
}

/**
 * Create Prisma ORM setup files in the db package
 */
async function createPrismaSetup(rootPath: string, database: "postgresql" | "mysql" | "sqlite"): Promise<void> {
	// Create db package directory
	const dbPackagePath = join(rootPath, "packages", "db");
	await mkdir(join(dbPackagePath, "src"), { recursive: true });

	// Update package.json with Prisma dependencies
	await updateDbPackageJson(dbPackagePath, "prisma", database);

	// Create Prisma client file
	const clientContent = getPrismaClientContent();
	await writeFile(join(dbPackagePath, "src", "client.ts"), clientContent, { encoding: "utf-8" });

	// Update index.ts to export everything
	const indexContent = `export * from "./client";
// Note: Prisma types will be available after running 'bun run db:generate'
// export type { User } from "@prisma/client";
`;
	await writeFile(join(dbPackagePath, "src", "index.ts"), indexContent, { encoding: "utf-8" });

	// Create Prisma schema with User model
	await mkdir(join(dbPackagePath, "prisma"), { recursive: true });
	const schemaContent = getPrismaSchemaContent(database);
	await writeFile(join(dbPackagePath, "prisma", "schema.prisma"), schemaContent, { encoding: "utf-8" });

	// Create seed file
	const seedContent = getPrismaSeedContent();
	await writeFile(join(dbPackagePath, "src", "seed.ts"), seedContent, { encoding: "utf-8" });

	// Create environment file
	const envContent = getPrismaEnvContent(database);
	await writeFile(join(rootPath, ".env.example"), envContent, { encoding: "utf-8" });
}

/**
 * Update db package.json with ORM-specific dependencies and scripts
 */
async function updateDbPackageJson(
	dbPackagePath: string,
	ormType: "drizzle" | "prisma",
	database: "postgresql" | "mysql" | "sqlite",
): Promise<void> {
	const packageJsonPath = join(dbPackagePath, "package.json");

	// Read existing package.json
	const packageJsonContent = await readFile(packageJsonPath, "utf-8");
	const packageJson = JSON.parse(packageJsonContent);

	// Add ORM dependencies
	if (ormType === "drizzle") {
		packageJson.dependencies = {
			...packageJson.dependencies,
			"drizzle-orm": "^0.44.0",
		};

		// Add database-specific drivers
		switch (database) {
			case "postgresql":
				packageJson.dependencies.postgres = "^3.4.0";
				break;
			case "mysql":
				packageJson.dependencies.mysql2 = "^3.6.0";
				break;
			case "sqlite":
				packageJson.dependencies["better-sqlite3"] = "^9.0.0";
				packageJson.devDependencies = {
					...packageJson.devDependencies,
					"@types/better-sqlite3": "^7.6.0",
				};
				break;
		}

		packageJson.devDependencies = {
			...packageJson.devDependencies,
			"drizzle-kit": "^0.31.0",
		};

		// Add Drizzle scripts
		packageJson.scripts = {
			...packageJson.scripts,
			"db:generate": "drizzle-kit generate --config=./drizzle.config.ts",
			"db:push": "drizzle-kit push --config=./drizzle.config.ts",
			"db:migrate": "drizzle-kit migrate --config=./drizzle.config.ts",
			"db:studio": "drizzle-kit studio --config=./drizzle.config.ts",
		};
	} else if (ormType === "prisma") {
		packageJson.dependencies = {
			...packageJson.dependencies,
			"@prisma/client": "^5.0.0",
		};

		packageJson.devDependencies = {
			...packageJson.devDependencies,
			prisma: "^5.0.0",
		};

		// Add Prisma scripts
		packageJson.scripts = {
			...packageJson.scripts,
			"db:generate": "prisma generate --schema=./prisma/schema.prisma",
			"db:push": "prisma db push --schema=./prisma/schema.prisma",
			"db:migrate": "prisma migrate dev --schema=./prisma/schema.prisma",
			"db:studio": "prisma studio --schema=./prisma/schema.prisma",
			"db:seed": "bun run src/seed.ts",
		};

		// Add Prisma configuration
		packageJson.prisma = {
			schema: "./prisma/schema.prisma",
		};
	}

	// Write updated package.json
	await writeJsonFile(packageJsonPath, packageJson);
}

/**
 * Generate Drizzle database connection content
 */
export function getDrizzleDbContent(database: "postgresql" | "mysql" | "sqlite"): string {
	switch (database) {
		case "postgresql":
			return `import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(databaseUrl);
export const db = drizzle(client);
`;

		case "mysql":
			return `import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL environment variable is required");
}

const connection = await mysql.createConnection(databaseUrl);
export const db = drizzle(connection);
`;

		case "sqlite":
			return `import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

const dbPath = process.env.DATABASE_URL || "./local.db";
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite);
`;
	}
}

/**
 * Generate Drizzle schema content
 */
export function getDrizzleSchemaContent(database: "postgresql" | "mysql" | "sqlite"): string {
	const imports =
		database === "postgresql"
			? 'import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";'
			: database === "mysql"
				? 'import { mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";'
				: 'import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";';

	const tableFunction = database === "postgresql" ? "pgTable" : database === "mysql" ? "mysqlTable" : "sqliteTable";

	const idField =
		database === "postgresql"
			? 'id: uuid("id").defaultRandom().primaryKey(),'
			: database === "mysql"
				? 'id: varchar("id", { length: 36 }).primaryKey(),'
				: 'id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),';

	const timestampFields =
		database === "sqlite"
			? `createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),`
			: `createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),`;

	return `${imports}

export const users = ${tableFunction}("users", {
	${idField}
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	${timestampFields}
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
`;
}

/**
 * Generate Drizzle config content
 */
export function getDrizzleConfigContent(database: "postgresql" | "mysql" | "sqlite"): string {
	const dialect = database === "postgresql" ? "postgresql" : database;

	return `import type { Config } from "drizzle-kit";

export default {
	schema: "./packages/db/src/schema.ts",
	out: "./packages/db/drizzle",
	dialect: "${dialect}",
	dbCredentials: {
		${database === "sqlite" ? 'url: process.env.DATABASE_URL || "./local.db",' : "url: process.env.DATABASE_URL!,"}
	},
} satisfies Config;
`;
}

/**
 * Generate Drizzle environment content
 */
export function getDrizzleEnvContent(database: "postgresql" | "mysql" | "sqlite"): string {
	const exampleUrl =
		database === "postgresql"
			? "postgresql://postgres:postgres@localhost:5432/myapp_dev"
			: database === "mysql"
				? "mysql://root:root@localhost:3306/myapp_dev"
				: "./local.db";

	return `# Database
DATABASE_URL="${exampleUrl}"
`;
}

/**
 * Generate Prisma client content
 */
export function getPrismaClientContent(): string {
	return `import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
`;
}

/**
 * Generate Prisma schema content
 */
export function getPrismaSchemaContent(database: "postgresql" | "mysql" | "sqlite"): string {
	const provider = database === "postgresql" ? "postgresql" : database;

	return `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
	provider = "prisma-client-js"
}

datasource db {
	provider = "${provider}"
	url      = env("DATABASE_URL")
}

model User {
	id        String   @id @default(cuid())
	name      String
	email     String   @unique
	createdAt DateTime @default(now()) @map("created_at")
	updatedAt DateTime @updatedAt @map("updated_at")

	@@map("users")
}
`;
}

/**
 * Generate Prisma seed content
 */
export function getPrismaSeedContent(): string {
	return `import { db } from "./client";

async function main() {
	// Create sample user
	const user = await db.user.create({
		data: {
			name: "John Doe",
			email: "john@example.com",
		},
	});

	console.log("Created user:", user);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await db.$disconnect();
	});
`;
}

/**
 * Generate Prisma environment content
 */
export function getPrismaEnvContent(database: "postgresql" | "mysql" | "sqlite"): string {
	const exampleUrl =
		database === "postgresql"
			? "postgresql://postgres:postgres@localhost:5432/myapp_dev"
			: database === "mysql"
				? "mysql://root:root@localhost:3306/myapp_dev"
				: "file:./dev.db";

	return `# Database
DATABASE_URL="${exampleUrl}"
`;
}
