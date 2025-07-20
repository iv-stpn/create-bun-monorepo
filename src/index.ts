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
		const subCommand = args[1];

		switch (command) {
			case "add":
				if (subCommand === "package") {
					await addSinglePackage();
				} else if (subCommand === "app") {
					await addSingleApp();
				} else if (subCommand === "orm") {
					await addOrmSetup();
				} else if (subCommand) {
					console.log(`Unknown add subcommand: ${subCommand}`);
					displayAddHelp();
					process.exit(1);
				} else {
					await addToMonorepo();
				}
				break;
			case "scaffold":
			case undefined:
				await create();
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

function displayHelp() {
	console.log("Available commands:");
	console.log("  scaffold (default) - Create a new monorepo");
	console.log("  add               - Add multiple components to existing monorepo");
	console.log("  add package       - Add a single package to existing monorepo");
	console.log("  add app           - Add a single app to existing monorepo");
	console.log("  add orm           - Add ORM setup to existing monorepo");
}

function displayAddHelp() {
	console.log("Available add subcommands:");
	console.log("  add               - Add multiple components (interactive)");
	console.log("  add package       - Add a single package");
	console.log("  add app           - Add a single app");
	console.log("  add orm           - Add ORM setup");
}

main();
