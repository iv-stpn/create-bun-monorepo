/**
 * CLI helpers and command line utilities
 */

import chalk from "chalk";

/**
 * Display banner with tool information
 */
export function displayBanner(): void {
	console.log(chalk.blue.bold("🚀 Bun Monorepo Scaffolder"));
	console.log(chalk.gray("Create modern monorepos with Bun, TypeScript, and your favorite tools\n"));
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
