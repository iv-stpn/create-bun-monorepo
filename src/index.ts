#!/usr/bin/env node

import { addOrmSetup, addSingleApp, addSinglePackage, addToMonorepo } from "./add-command";
import { logger } from "./lib/logger";
import { scaffold } from "./scaffolder";
import { displayBanner, displayError } from "./utils/cli";

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
				await scaffold();
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
