/**
 * ORM (Object-Relational Mapping) utilities for database setup
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { OrmConfig, OrmType } from "../types";

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
		dependencies["drizzle-orm"] = "^0.29.0";
		devDependencies["drizzle-kit"] = "^0.20.0";

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
			"db:generate": "drizzle-kit generate",
			"db:migrate": "drizzle-kit migrate",
			"db:studio": "drizzle-kit studio",
			"db:push": "drizzle-kit push",
		};
	}

	if (type === "prisma") {
		return {
			"db:generate": "prisma generate",
			"db:migrate": "prisma migrate dev",
			"db:studio": "prisma studio",
			"db:push": "prisma db push",
			"db:reset": "prisma migrate reset",
			"db:seed": "bun run src/lib/seed.ts",
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
 * Create Drizzle ORM setup files
 */
async function createDrizzleSetup(rootPath: string, database: "postgresql" | "mysql" | "sqlite"): Promise<void> {
	// Create lib directory
	await mkdir(join(rootPath, "src", "lib"), { recursive: true });

	// Create database connection file
	const dbContent = getDrizzleDbContent(database);
	await writeFile(join(rootPath, "src", "lib", "db.ts"), dbContent, { encoding: "utf-8" });

	// Create schema file with User model
	const schemaContent = getDrizzleSchemaContent(database);
	await writeFile(join(rootPath, "src", "lib", "schema.ts"), schemaContent, { encoding: "utf-8" });

	// Create Drizzle config
	const configContent = getDrizzleConfigContent(database);
	await writeFile(join(rootPath, "drizzle.config.ts"), configContent, { encoding: "utf-8" });

	// Create environment file
	const envContent = getDrizzleEnvContent(database);
	await writeFile(join(rootPath, ".env.example"), envContent, { encoding: "utf-8" });
}

/**
 * Create Prisma ORM setup files
 */
async function createPrismaSetup(rootPath: string, database: "postgresql" | "mysql" | "sqlite"): Promise<void> {
	// Create lib directory
	await mkdir(join(rootPath, "src", "lib"), { recursive: true });

	// Create Prisma client file
	const clientContent = getPrismaClientContent();
	await writeFile(join(rootPath, "src", "lib", "db.ts"), clientContent, { encoding: "utf-8" });

	// Create Prisma schema with User model
	await mkdir(join(rootPath, "prisma"), { recursive: true });
	const schemaContent = getPrismaSchemaContent(database);
	await writeFile(join(rootPath, "prisma", "schema.prisma"), schemaContent, { encoding: "utf-8" });

	// Create seed file
	const seedContent = getPrismaSeedContent();
	await writeFile(join(rootPath, "src", "lib", "seed.ts"), seedContent, { encoding: "utf-8" });

	// Create environment file
	const envContent = getPrismaEnvContent(database);
	await writeFile(join(rootPath, ".env.example"), envContent, { encoding: "utf-8" });
}

/**
 * Generate Drizzle database connection content
 */
function getDrizzleDbContent(database: "postgresql" | "mysql" | "sqlite"): string {
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
function getDrizzleSchemaContent(database: "postgresql" | "mysql" | "sqlite"): string {
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
function getDrizzleConfigContent(database: "postgresql" | "mysql" | "sqlite"): string {
	const dialect = database === "postgresql" ? "postgresql" : database;

	return `import type { Config } from "drizzle-kit";

export default {
	schema: "./src/lib/schema.ts",
	out: "./drizzle",
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
function getDrizzleEnvContent(database: "postgresql" | "mysql" | "sqlite"): string {
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
function getPrismaClientContent(): string {
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
function getPrismaSchemaContent(database: "postgresql" | "mysql" | "sqlite"): string {
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
function getPrismaSeedContent(): string {
	return `import { db } from "./db";

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
function getPrismaEnvContent(database: "postgresql" | "mysql" | "sqlite"): string {
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
