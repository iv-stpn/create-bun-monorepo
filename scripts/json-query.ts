#!/usr/bin/env bun
/**
 * JSON-based query tool for template configuration
 * Usage: bun run scripts/json-query.ts <query> [--format=json|text]
 *
 * Examples:
 *   bun run scripts/json-query.ts "templates"
 *   bun run scripts/json-query.ts "categories"
 *   bun run scripts/json-query.ts "app_templates" --format=json
 *   bun run scripts/json-query.ts "package_templates" --format=text
 */

import { getTemplateConfig } from "../src/templates-config";

const args = process.argv.slice(2);
const query = args[0];
const formatFlag = args.find((arg) => arg.startsWith("--format="));
const format = formatFlag ? formatFlag.split("=")[1] : "text";

if (!query) {
	console.error("Usage: bun run scripts/json-query.ts <query> [--format=json|text]");
	console.error("");
	console.error("Available queries:");
	console.error("  templates          - All available templates");
	console.error("  categories         - All template categories");
	console.error("  app_templates      - Application templates only");
	console.error("  package_templates  - Package templates only");
	console.error("  frontend_templates - Frontend application templates");
	console.error("  backend_templates  - Backend application templates");
	console.error("  mobile_templates   - Mobile application templates");
	console.error("  config             - Full template configuration");
	process.exit(1);
}

function outputResult(data: unknown) {
	if (format === "json") {
		console.log(JSON.stringify(data, null, 2));
	} else {
		if (Array.isArray(data)) {
			console.log(data.join(" "));
		} else if (typeof data === "object" && data !== null) {
			console.log(JSON.stringify(data, null, 2));
		} else {
			console.log(String(data));
		}
	}
}

try {
	const config = getTemplateConfig();

	switch (query) {
		case "config": {
			outputResult(config);
			break;
		}

		case "categories": {
			const categories = Object.keys(config.categories);
			outputResult(categories);
			break;
		}

		case "templates": {
			const allTemplates: string[] = [];
			for (const [, categoryData] of Object.entries(config.categories)) {
				if (categoryData?.templates) {
					const templates = Object.keys(categoryData.templates);
					allTemplates.push(...templates);
				}
			}
			outputResult(allTemplates);
			break;
		}

		case "app_templates": {
			const appTemplates: string[] = [];
			for (const [categoryName, categoryData] of Object.entries(config.categories)) {
				if (categoryName !== "packages" && categoryData?.templates) {
					const templates = Object.keys(categoryData.templates);
					appTemplates.push(...templates);
				}
			}
			outputResult(appTemplates);
			break;
		}

		case "package_templates": {
			const packagesCategory = config.categories.packages;
			const templates = packagesCategory?.templates ? Object.keys(packagesCategory.templates) : [];
			outputResult(templates);
			break;
		}

		case "frontend_templates": {
			const frontendCategory = config.categories.frontend;
			const templates = frontendCategory?.templates ? Object.keys(frontendCategory.templates) : [];
			outputResult(templates);
			break;
		}

		case "backend_templates": {
			const backendCategory = config.categories.backend;
			const templates = backendCategory?.templates ? Object.keys(backendCategory.templates) : [];
			outputResult(templates);
			break;
		}

		case "mobile_templates": {
			const mobileCategory = config.categories.mobile;
			const templates = mobileCategory?.templates ? Object.keys(mobileCategory.templates) : [];
			outputResult(templates);
			break;
		}

		default:
			console.error(`Unknown query: ${query}`);
			console.error("");
			console.error("Available queries:");
			console.error("  templates, categories, app_templates, package_templates,");
			console.error("  frontend_templates, backend_templates, mobile_templates, config");
			process.exit(1);
	}
} catch (error) {
	console.error("Error:", error instanceof Error ? error.message : String(error));
	process.exit(1);
}
