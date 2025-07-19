/**
 * Type definitions for the Bun Monorepo Scaffolder
 */

export interface AppTemplate {
	name: string;
	template: string;
	category: string;
}

export interface PackageTemplate {
	name: string;
	template: string;
	category: string;
}

export type OrmType = "drizzle" | "prisma" | "none";

export interface OrmConfig {
	type: OrmType;
	database: "postgresql" | "mysql" | "sqlite";
}

export interface ScaffoldOptions {
	appName: string;
	linting: "biome" | "eslint-prettier" | "none";
	apps: AppTemplate[];
	packages: PackageTemplate[];
	orm?: OrmConfig;
}

export interface FileReplacements {
	[placeholder: string]: string;
}
