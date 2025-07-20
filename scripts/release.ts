#!/usr/bin/env bun

import { execSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Colors for output
const colors = {
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	reset: "\x1b[0m",
};

function printInfo(message: string) {
	console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function printSuccess(message: string) {
	console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function printWarning(message: string) {
	console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function printError(message: string) {
	console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function runCommand(command: string, description: string, skipErrors = false): boolean {
	try {
		printInfo(description);
		execSync(command, { stdio: "inherit" });
		return true;
	} catch {
		if (!skipErrors) {
			printError(`Failed: ${description}`);
			process.exit(1);
		}
		return false;
	}
}

function checkMainBranch() {
	try {
		const currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
		if (currentBranch !== "main") {
			printError(`You must be on the main branch to create a release. Current branch: ${currentBranch}`);
			process.exit(1);
		}
	} catch {
		printWarning("Could not determine current branch. Continuing...");
	}
}

function checkCleanWorkingDirectory() {
	try {
		const status = execSync("git status --porcelain", { encoding: "utf8" }).trim();
		if (status) {
			printError("Working directory is not clean. Please commit or stash your changes.");
			process.exit(1);
		}
	} catch {
		printWarning("Could not check git status. Continuing...");
	}
}

function checkChangesets(): boolean {
	const changesetDir = ".changeset";
	if (!existsSync(changesetDir)) {
		return false;
	}

	const files = readdirSync(changesetDir).filter((file) => file.endsWith(".md") && file !== "README.md");

	return files.length > 0;
}

function createAutoChangeset(changeType: string, message: string) {
	printInfo("Creating automatic changeset...");

	const timestamp = Date.now();
	const changesetFile = join(".changeset", `auto-release-${timestamp}.md`);

	const content = `---
"create-bun-monorepo": ${changeType}
---

${message}
`;

	writeFileSync(changesetFile, content);
	printSuccess(`Created changeset: ${changesetFile}`);
}

interface ReleaseOptions {
	type: "patch" | "minor" | "major";
	message: string;
	force: boolean;
	skipTests: boolean;
	skipLint: boolean;
	skipTypecheck: boolean;
	autoChangeset: boolean;
}

const isReleaseType = (type: string): type is "patch" | "minor" | "major" => ["patch", "minor", "major"].includes(type);

function parseArgs(): ReleaseOptions {
	const args = process.argv.slice(2);
	const options: ReleaseOptions = {
		type: "patch",
		message: "Automated release",
		force: false,
		skipTests: false,
		skipLint: false,
		skipTypecheck: false,
		autoChangeset: false,
	};

	for (const [i, arg] of args.entries()) {
		switch (arg) {
			case "-t":
			case "--type": {
				const type = args[i + 1];
				if (!type) throw new Error("Missing value for --type option");

				if (!isReleaseType(type)) {
					printError(`Invalid change type: ${type}. Must be patch, minor, or major.`);
					process.exit(1);
				}
				options.type = type;
				break;
			}
			case "-m":
			case "--message": {
				const message = args[i + 1];
				if (!message) throw new Error("Missing value for --message option");

				options.message = message;
				break;
			}
			case "-f":
			case "--force": {
				options.force = true;
				break;
			}
			case "--skip-tests": {
				options.skipTests = true;
				break;
			}
			case "--skip-lint": {
				options.skipLint = true;
				break;
			}
			case "--skip-typecheck": {
				options.skipTypecheck = true;
				break;
			}
			case "--auto-changeset": {
				options.autoChangeset = true;
				break;
			}
			case "-h":
			case "--help": {
				showHelp();
				process.exit(0);
				break;
			}
			default: {
				if (arg.startsWith("-")) {
					printError(`Unknown option: ${arg}`);
					showHelp();
					process.exit(1);
				}
				break;
			}
		}
	}

	return options;
}

function showHelp() {
	console.log(`Usage: bun run scripts/release.ts [OPTIONS]

Options:
  -t, --type TYPE      Change type: patch, minor, major (default: patch)
  -m, --message MSG    Release message (default: 'Automated release')
  -f, --force          Skip checks and force release
  --skip-tests         Skip running tests
  --skip-lint          Skip linting
  --skip-typecheck     Skip type checking
  --auto-changeset     Create changeset automatically if none exist
  -h, --help           Show this help message

Examples:
  bun run scripts/release.ts                                    # Create a patch release
  bun run scripts/release.ts -t minor -m "Add new feature"      # Create a minor release with custom message
  bun run scripts/release.ts --auto-changeset                  # Auto-create changeset if none exist
  bun run scripts/release.ts --force                           # Skip all checks and force release`);
}

function main() {
	const options = parseArgs();

	printInfo("Starting release process...");
	printInfo(`Change type: ${options.type}`);
	printInfo(`Message: ${options.message}`);

	// Pre-flight checks (unless forced)
	if (options.force) {
		printWarning("Force mode enabled - skipping all checks");
	} else {
		checkMainBranch();
		checkCleanWorkingDirectory();

		// Quality checks
		if (!options.skipTypecheck) {
			runCommand("bun run typecheck", "Running type checking...");
			printSuccess("Type checking passed");
		}

		if (!options.skipLint) {
			runCommand("bun run lint", "Running linting...");
			printSuccess("Linting passed");
		}

		if (!options.skipTests) {
			runCommand("bun run test:full", "Running tests...");
			printSuccess("All tests passed");
		}
	}

	// Build the project
	runCommand("bun run build", "Building project...");
	printSuccess("Build completed");

	// Check for changesets or create one automatically
	if (!checkChangesets()) {
		if (options.autoChangeset) {
			createAutoChangeset(options.type, options.message);
		} else {
			printError(
				"No changesets found. Use --auto-changeset to create one automatically or create one manually with 'bun run changeset'",
			);
			process.exit(1);
		}
	}

	// Version packages
	runCommand("bun run changeset:version", "Versioning packages...");
	printSuccess("Packages versioned");

	// Commit version changes if any
	try {
		const status = execSync("git status --porcelain", { encoding: "utf8" }).trim();
		if (status) {
			printInfo("Committing version changes...");
			execSync("git add .", { stdio: "inherit" });
			execSync('git commit -m "Version packages"', { stdio: "inherit" });
			execSync("git push origin main", { stdio: "inherit" });
			printSuccess("Version changes committed and pushed");
		} else {
			printInfo("No version changes to commit");
		}
	} catch {
		printWarning("Could not commit version changes automatically");
	}

	// Publish packages
	runCommand("bun run changeset:publish", "Publishing packages...");
	printSuccess("Packages published");

	printSuccess("Release completed successfully! 🚀");
}

// Run the main function
main();
