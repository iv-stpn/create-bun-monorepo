#!/usr/bin/env node

import chalk from "chalk";
import { addOrmSetup, addSingleApp, addSinglePackage, addToMonorepo } from "./add-command";
import { create } from "./create-command";
import { logger } from "./lib/logger";

/**
 * Display banner with tool information
 */
export function displayBanner(): void {
	console.log(chalk.blue.bold("🚀 create-bun-monorepo"));
	console.log(chalk.gray("Create modern monorepos with Bun, TypeScript, and your favorite tools!\n"));
}

/**
 * Display error with formatting
 */
export function displayError(error: Error): void {
	console.log(chalk.red.bold("✗ Error:"), chalk.red(error.message));

	if (error.cause && error.cause instanceof Error) {
		console.log(chalk.gray("  Caused by:"), chalk.gray(error.cause.message));
	}

	if (process.env.DEBUG === "true" && error.stack) {
		console.log(chalk.gray("\nStack trace:"));
		console.log(chalk.gray(error.stack));
	}
}

async function main() {
	try {
		displayBanner();

		// Parse command line arguments
		const args = process.argv.slice(2);
		const command = args[0];

		// Handle help flags
		if (command === "help" || command === "--help" || command === "-h") {
			displayHelp();
			return;
		}

		switch (command) {
			case "add":
				await handleAddCommand(args.slice(1));
				break;
			case "scaffold":
			case "create":
			case undefined:
				await handleCreateCommand(args.slice(1));
				break;
			default:
				console.log(`Unknown command: ${command}`);
				displayHelp();
				process.exit(1);
		}
	} catch (error) {
		if (error instanceof Error) {
			displayError(error);
		} else {
			logger.error(`Unknown error: ${String(error)}`);
		}
		process.exit(1);
	}
}

async function handleAddCommand(args: string[]) {
	// Parse flags
	const flags = parseFlags(args);

	if (flags.package) {
		const packageInput = typeof flags.package === "string" ? flags.package : "";
		const { name: packageName, template: packageTemplate } = parseNameAndTemplate(packageInput);
		console.log(`Adding package: ${packageName}${packageTemplate ? ` (template: ${packageTemplate})` : ""}`);
		await addSinglePackage(packageName, packageTemplate);
	} else if (flags.app) {
		const appInput = typeof flags.app === "string" ? flags.app : "";
		const { name: appName, template: appTemplate } = parseNameAndTemplate(appInput);
		console.log(`Adding app: ${appName}${appTemplate ? ` (template: ${appTemplate})` : ""}`);
		await addSingleApp(appName, appTemplate);
	} else if (flags.orm) {
		console.log("Adding ORM setup");
		await addOrmSetup();
	} else {
		// Interactive mode for multiple additions
		await addToMonorepo();
	}
}

async function handleCreateCommand(args: string[]) {
	// Parse create command arguments - support both old and new format
	const flags = parseFlags(args);

	// Set environment variables from flags for backward compatibility
	if (flags.apps && typeof flags.apps === "string") {
		process.env.APPS = flags.apps;
	} else if (Array.isArray(flags.apps)) {
		process.env.APPS = flags.apps.join(",");
	}

	if (flags.packages && typeof flags.packages === "string") {
		process.env.PACKAGES = flags.packages;
	} else if (Array.isArray(flags.packages)) {
		process.env.PACKAGES = flags.packages.join(",");
	}

	if (flags.orm && typeof flags.orm === "string") {
		process.env.ORM = flags.orm;
	}

	if (flags.yes) process.env.NON_INTERACTIVE = "true";
	if (args[0] && !args[0].startsWith("--")) process.env.PROJECT_NAME = args[0];

	await create();
}

interface ParsedFlags {
	[key: string]: string | string[] | boolean;
}

function parseFlags(args: string[]): ParsedFlags {
	const flags: ParsedFlags = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg?.startsWith("--")) {
			const flagName = arg.substring(2);
			const nextArg = args[i + 1];

			// Boolean flags
			if (!nextArg || nextArg.startsWith("--")) {
				flags[flagName] = true;
			} else {
				// String flags
				flags[flagName] = nextArg;
				i++; // Skip next arg since we consumed it
			}
		}
	}

	return flags;
}

// Regex pattern for parsing bracket notation
const BRACKET_PATTERN = /^(.*)?\[([^\]]+)\]$/;

/**
 * Parse name and template from bracket notation
 * Examples:
 * - "mypackage[hooks]" -> { name: "mypackage", template: "hooks" }
 * - "mypackage" -> { name: "mypackage", template: undefined }
 * - "[hooks]" -> { name: "hooks", template: "hooks" }
 */
function parseNameAndTemplate(input: string): { name: string; template?: string } {
	const match = input.match(BRACKET_PATTERN);

	if (match) {
		const [, namePrefix, template] = match;
		// If no name prefix (e.g., "[hooks]"), use template as name
		const name = namePrefix || template;
		if (!name) throw new Error("Invalid input format. Please provide a valid name or template.");
		return { name: name.trim(), template: template?.trim() };
	}

	return { name: input.trim() };
}

function displayHelp() {
	console.log("Available commands:");
	console.log("  create (default)         - Create a new monorepo");
	console.log("  add                      - Add multiple components to existing monorepo (interactive)");
	console.log("  add --package <name>     - Add a single package to existing monorepo");
	console.log("  add --app <name>         - Add a single app to existing monorepo");
	console.log("  add --orm                - Add ORM setup to existing monorepo");
	console.log("");
	console.log("Template Selection:");
	console.log("  Use bracket notation to specify templates:");
	console.log("  add --package 'myutils[utils]'     - Create 'myutils' package using 'utils' template");
	console.log("  add --app 'myapi[express]'         - Create 'myapi' app using 'express' template");
	console.log("  add --package '[hooks]'            - Create 'hooks' package using 'hooks' template");
	console.log("  add --app '[nextjs]'               - Create 'nextjs' app using 'nextjs' template");
	console.log("");
	console.log("Interactive Mode:");
	console.log("  When using 'create' in interactive mode, bracket notation also works:");
	console.log("  'myapp[nextjs], api[express]'      - Creates apps with specified templates");
	console.log("  'frontend, backend[hono]'          - Mixed: one interactive, one with template");
}

main();
