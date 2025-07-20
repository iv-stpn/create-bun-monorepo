#!/usr/bin/env bun
/**
 * Extract template information from TypeScript templates config
 * Usage: bun run scripts/template-query.ts <query>
 *
 * Examples:
 *   bun run scripts/template-query.ts "app_templates"
 *   bun run scripts/template-query.ts "package_templates"
 */

import { getTemplateConfig } from "../src/templates";

const [, , query] = process.argv;

if (!query) {
	console.error("Usage: bun run scripts/template-query.ts <query>");
	process.exit(1);
}

try {
	const config = getTemplateConfig();

	switch (query) {
		case "app_templates": {
			// Extract app templates from categories (react, next, express, hono, etc.)
			const result: string[] = [];
			for (const [categoryName, categoryData] of Object.entries(config.categories)) {
				if (categoryName !== "packages" && categoryData?.templates) {
					const templates = Object.keys(categoryData.templates);
					result.push(...templates);
				}
			}
			console.log(result.join(" "));
			break;
		}

		case "package_templates": {
			// Extract package templates
			const packagesCategory = config.categories.packages;
			const templates = packagesCategory?.templates ? Object.keys(packagesCategory.templates) : [];
			console.log(templates.join(" "));
			break;
		}

		default:
			console.error(`Unknown query: ${query}`);
			process.exit(1);
	}
} catch (error) {
	console.error("Error:", error instanceof Error ? error.message : String(error));
	process.exit(1);
}
