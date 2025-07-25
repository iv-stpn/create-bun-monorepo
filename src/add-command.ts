import { access, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import prompts from "prompts";
import { addDockerCompose } from "./injections";
import {
	createOrmConfig,
	getDrizzleConfigContent,
	getDrizzleDbContent,
	getDrizzleEnvContent,
	getDrizzleSchemaContent,
	getOrmDependencies,
	getOrmScripts,
	getPrismaClientContent,
	getPrismaEnvContent,
	getPrismaSchemaContent,
	getPrismaSeedContent,
} from "./lib/orm-setup";
import { createAppWithProcessing, createPackageWithProcessing, getPackageTemplateChoices } from "./lib/shared-setup";
import type { TemplatesConfig } from "./templates";
import { getTemplateConfig } from "./templates";
import type { AppTemplate, OrmConfig, PackageTemplate } from "./types";
import { writeJsonFile } from "./utils/file";

interface PackageJsonStructure {
	workspaces?: string[];
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	scripts?: Record<string, string>;
	[key: string]: unknown;
}

interface MonorepoStructure {
	rootPath: string;
	packageJson: PackageJsonStructure;
	hasAppsDir: boolean;
	hasPackagesDir: boolean;
	apps: string[];
	packages: string[];
	hasOrmSetup: boolean;
}

interface AddOptions {
	addApps: AppTemplate[];
	addPackages: PackageTemplate[];
	addOrmSetup?: OrmConfig;
}

/**
 * Extract project name from path
 */
function getProjectNameFromPath(path: string): string {
	return path.split("/").pop() || "monorepo";
}

export async function addToMonorepo(): Promise<void> {
	console.log(chalk.blue("🔧 Add to Existing Monorepo"));
	console.log(chalk.gray("Add apps, packages, or ORM setup to your existing Bun monorepo\n"));

	// Validate we're in a Bun monorepo
	const monorepoInfo = await validateMonorepoStructure();

	if (!monorepoInfo) {
		console.log(chalk.red("❌ Not a valid Bun monorepo"));
		console.log(chalk.gray("This command must be run from the root of a Bun monorepo."));
		console.log(chalk.gray("Create a new monorepo with: bun create bun-monorepo"));
		process.exit(1);
	}

	console.log(chalk.green("✅ Valid Bun monorepo detected"));
	console.log(chalk.gray(`📁 Root: ${monorepoInfo.rootPath}`));
	console.log(chalk.gray(`📦 Existing apps: ${monorepoInfo.apps.join(", ") || "none"}`));
	console.log(chalk.gray(`📦 Existing packages: ${monorepoInfo.packages.join(", ") || "none"}`));
	console.log(chalk.gray(`🗄️ ORM setup: ${monorepoInfo.hasOrmSetup ? "configured" : "not configured"}\n`));

	const options = await promptAddOptions(monorepoInfo);
	await addToExistingMonorepo(monorepoInfo, options);

	console.log(chalk.green("\n✅ Successfully added to monorepo!"));
	console.log(chalk.gray("📦 Run the following commands to finalize:"));
	console.log(chalk.yellow("  bun install"));
	console.log(chalk.yellow("  bun run format"));
}

async function validateMonorepoStructure(): Promise<MonorepoStructure | null> {
	try {
		const rootPath = process.cwd();

		// Check for package.json
		const packageJsonPath = join(rootPath, "package.json");
		await access(packageJsonPath);
		const packageJsonContent = await readFile(packageJsonPath, "utf-8");
		const packageJson = JSON.parse(packageJsonContent);

		// Validate it's a monorepo (has workspaces)
		if (!packageJson.workspaces || !Array.isArray(packageJson.workspaces)) {
			return null;
		}

		// Check for apps and packages directories
		const hasAppsDir = await directoryExists(join(rootPath, "apps"));
		const hasPackagesDir = await directoryExists(join(rootPath, "packages"));

		// Get existing apps and packages
		const apps = hasAppsDir ? await getDirectoryContents(join(rootPath, "apps")) : [];
		const packages = hasPackagesDir ? await getDirectoryContents(join(rootPath, "packages")) : [];

		// Check for ORM setup (basic detection)
		const hasOrmSetup = await hasExistingOrmSetup(rootPath);

		return {
			rootPath,
			packageJson,
			hasAppsDir,
			hasPackagesDir,
			apps,
			packages,
			hasOrmSetup,
		};
	} catch {
		return null;
	}
}

async function directoryExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function getDirectoryContents(path: string): Promise<string[]> {
	try {
		const { readdir } = await import("node:fs/promises");
		const contents = await readdir(path, { withFileTypes: true });
		return contents.filter((item) => item.isDirectory()).map((item) => item.name);
	} catch {
		return [];
	}
}

async function hasExistingOrmSetup(rootPath: string): Promise<boolean> {
	// Check for common ORM files
	const ormFiles = ["drizzle.config.ts", "prisma/schema.prisma", "src/lib/db.ts"];

	for (const file of ormFiles) {
		if (await directoryExists(join(rootPath, file))) {
			return true;
		}
	}

	return false;
}

async function promptAddOptions(monorepoInfo: MonorepoStructure): Promise<AddOptions> {
	const templateConfig = getTemplateConfig();

	const initialResponse = await prompts([
		{
			type: "multiselect",
			name: "whatToAdd",
			message: "What would you like to add?",
			choices: [
				{ title: "Apps", value: "apps", description: "Add new applications to the monorepo" },
				{ title: "Packages", value: "packages", description: "Add new shared packages" },
				{ title: "Blank Packages", value: "blankPackages", description: "Add custom blank packages" },
				...(monorepoInfo.hasOrmSetup
					? []
					: [{ title: "ORM Setup", value: "orm", description: "Add database ORM configuration" }]),
			],
			instructions: false,
		},
	]);

	if (!initialResponse.whatToAdd || initialResponse.whatToAdd.length === 0) {
		console.log(chalk.gray("Nothing selected. Exiting..."));
		process.exit(0);
	}

	const addApps: AppTemplate[] = [];
	const addPackages: PackageTemplate[] = [];
	let addOrmSetup: OrmConfig | undefined;

	// Handle apps
	if (initialResponse.whatToAdd.includes("apps")) {
		const appsResponse = await prompts({
			type: "text",
			name: "appNames",
			message: "Enter app names (comma-separated):",
			validate: (value: string) => (value.trim() ? true : "At least one app name is required"),
		});

		const appNames = appsResponse.appNames
			.split(",")
			.map((name: string) => name.trim())
			.filter(Boolean);

		for (const appName of appNames) {
			const app = await promptAppTemplate(appName, templateConfig);
			addApps.push(app);
		}
	}

	// Handle template packages
	if (initialResponse.whatToAdd.includes("packages")) {
		const packageResponse = await prompts({
			type: "multiselect",
			name: "selectedPackages",
			message: "Select packages to add:",
			choices: getPackageTemplateChoices(templateConfig),
			instructions: false,
		});

		const selectedPackageTemplates = packageResponse.selectedPackages || [];
		for (const templateKey of selectedPackageTemplates) {
			addPackages.push({
				name: templateKey,
				template: templateKey,
				category: "packages",
			});
		}
	}

	// Handle blank packages
	if (initialResponse.whatToAdd.includes("blankPackages")) {
		const blankPackagesResponse = await prompts({
			type: "text",
			name: "blankPackageNames",
			message: "Enter blank package names (comma-separated):",
			initial: "",
		});

		if (blankPackagesResponse.blankPackageNames?.trim()) {
			const blankPackageNames = blankPackagesResponse.blankPackageNames
				.split(",")
				.map((name: string) => name.trim())
				.filter(Boolean);

			for (const packageName of blankPackageNames) {
				addPackages.push({
					name: packageName,
					template: "blank",
					category: "blank",
				});
			}
		}
	}

	// Handle ORM setup
	if (initialResponse.whatToAdd.includes("orm")) {
		addOrmSetup = await promptOrmSetup();
	}

	return {
		addApps,
		addPackages,
		addOrmSetup,
	};
}

async function promptAppTemplate(appName: string, templateConfig: TemplatesConfig): Promise<AppTemplate> {
	console.log(chalk.cyan(`\nConfiguring app: ${appName}`));

	let selectedTemplate: AppTemplate | null = null;

	while (!selectedTemplate) {
		const categoryChoices = getTemplateChoices(templateConfig, "apps");
		const categoryResponse = await prompts({
			type: "select",
			name: "category",
			message: `Choose a template category for ${appName}:`,
			choices: categoryChoices,
		});

		if (!categoryResponse.category) {
			process.exit(0);
		}

		if (categoryResponse.category.template === null) {
			const templateChoices = getCategoryTemplateChoices(templateConfig, categoryResponse.category.category);
			const templateChoicesWithBack = [
				{ title: "← Go Back", description: "Return to category selection", value: "__GO_BACK__" },
				...templateChoices,
			];

			const templateResponse = await prompts({
				type: "select",
				name: "template",
				message: `Choose a template for ${appName}:`,
				choices: templateChoicesWithBack,
			});

			if (!templateResponse.template) {
				process.exit(0);
			}

			if (templateResponse.template === "__GO_BACK__") {
				continue;
			}

			selectedTemplate = {
				name: appName,
				template: templateResponse.template,
				category: categoryResponse.category.category,
			};
		} else {
			selectedTemplate = {
				name: appName,
				template: categoryResponse.category.template,
				category: categoryResponse.category.category,
			};
		}
	}

	return selectedTemplate;
}

async function promptOrmSetup(): Promise<OrmConfig> {
	console.log(chalk.cyan("\n🗄️ Database Setup"));

	const ormResponse = await prompts([
		{
			type: "select",
			name: "ormType",
			message: "Choose a database ORM:",
			choices: [
				{ title: "Drizzle ORM (lightweight, type-safe)", value: "drizzle" },
				{ title: "Prisma (full-featured, mature)", value: "prisma" },
			],
		},
	]);

	const databaseResponse = await prompts([
		{
			type: "select",
			name: "database",
			message: "Choose a database:",
			choices: [
				{ title: "PostgreSQL (recommended for production)", value: "postgresql" },
				{ title: "SQLite (great for development)", value: "sqlite" },
				{ title: "MySQL", value: "mysql" },
			],
		},
	]);

	return createOrmConfig(ormResponse.ormType, databaseResponse.database);
}

async function addToExistingMonorepo(monorepoInfo: MonorepoStructure, options: AddOptions): Promise<void> {
	const { rootPath } = monorepoInfo;
	const { addApps, addPackages, addOrmSetup } = options;

	// Create directories if needed
	if (addApps.length > 0 && !monorepoInfo.hasAppsDir) {
		await mkdir(join(rootPath, "apps"), { recursive: true });
	}

	if (addPackages.length > 0 && !monorepoInfo.hasPackagesDir) {
		await mkdir(join(rootPath, "packages"), { recursive: true });
	}

	// Add db package to packages list if ORM is being added
	const finalPackages = [...addPackages];
	if (addOrmSetup && addOrmSetup.type !== "none") {
		// Check if db package is already included
		const hasDbPackage = finalPackages.some((pkg) => pkg.name === "db");
		if (!hasDbPackage) {
			finalPackages.push({
				name: "db",
				template: "db",
				category: "packages",
			});
		}

		// Ensure packages directory exists for db package
		if (!monorepoInfo.hasPackagesDir) {
			await mkdir(join(rootPath, "packages"), { recursive: true });
		}
	}

	// Update package.json workspaces
	await updatePackageJsonWorkspaces(monorepoInfo, addApps.length > 0, finalPackages.length > 0, addOrmSetup);

	// Create apps
	for (const app of addApps) {
		await createApp(
			rootPath,
			app,
			[...monorepoInfo.packages, ...finalPackages.map((p) => p.name)],
			addOrmSetup,
			finalPackages,
		);
	}

	// Create packages (excluding db package as it will be created by createOrmSetup)
	for (const pkg of finalPackages) {
		if (pkg.name !== "db") {
			await createPackage(rootPath, pkg);
		}
	}

	// Add ORM setup (this will create the db package)
	if (addOrmSetup && addOrmSetup.type !== "none") {
		await createOrmSetup(rootPath, addOrmSetup);
		await addDockerCompose(rootPath, addOrmSetup);
	}

	// Update TypeScript references (include db package if ORM was added)
	await updateTsConfigReferences(monorepoInfo, addApps, finalPackages);
}

async function updatePackageJsonWorkspaces(
	monorepoInfo: MonorepoStructure,
	hasNewApps: boolean,
	hasNewPackages: boolean,
	ormSetup?: OrmConfig,
): Promise<void> {
	const { rootPath, packageJson } = monorepoInfo;

	// Ensure workspaces include necessary paths
	const workspaces = new Set(packageJson.workspaces || []);

	if (hasNewApps || monorepoInfo.hasAppsDir) {
		workspaces.add("apps/*");
	}

	if (hasNewPackages || monorepoInfo.hasPackagesDir) {
		workspaces.add("packages/*");
	}

	// Add ORM dependencies if needed
	if (ormSetup && ormSetup.type !== "none") {
		const ormDeps = getOrmDependencies(ormSetup);
		const ormScripts = getOrmScripts(ormSetup);

		packageJson.dependencies = {
			...packageJson.dependencies,
			...ormDeps.dependencies,
		};

		packageJson.devDependencies = {
			...packageJson.devDependencies,
			...ormDeps.devDependencies,
		};

		packageJson.scripts = {
			...packageJson.scripts,
			...ormScripts,
		};
	}

	packageJson.workspaces = Array.from(workspaces);

	await writeJsonFile(join(rootPath, "package.json"), packageJson);
}

async function createApp(
	rootPath: string,
	app: AppTemplate,
	existingPackages: string[],
	orm?: OrmConfig,
	allPackages?: PackageTemplate[],
): Promise<void> {
	// Change to parent directory to call createAppWithProcessing correctly
	const originalCwd = process.cwd();
	const parentDir = join(rootPath, "..");
	const projectName = getProjectNameFromPath(rootPath);

	// Convert existing packages to PackageTemplate format for processing
	const packagesForProcessing =
		allPackages || existingPackages.map((name) => ({ name, template: "unknown", category: "packages" }));

	try {
		process.chdir(parentDir);
		await createAppWithProcessing(projectName, app, packagesForProcessing, orm);
	} finally {
		process.chdir(originalCwd);
	}
}

async function createPackage(rootPath: string, pkg: PackageTemplate): Promise<void> {
	// Change to parent directory to call createPackageWithProcessing correctly
	const originalCwd = process.cwd();
	const parentDir = join(rootPath, "..");
	const projectName = getProjectNameFromPath(rootPath);

	try {
		process.chdir(parentDir);
		await createPackageWithProcessing(projectName, pkg);
	} finally {
		process.chdir(originalCwd);
	}
}

async function updateTsConfigReferences(
	monorepoInfo: MonorepoStructure,
	newApps: AppTemplate[],
	newPackages: PackageTemplate[],
): Promise<void> {
	const { rootPath } = monorepoInfo;
	const tsConfigPath = join(rootPath, "tsconfig.json");

	try {
		const tsConfigContent = await readFile(tsConfigPath, "utf-8");
		const tsConfig = JSON.parse(tsConfigContent);

		// Add new references
		const references = tsConfig.references || [];

		for (const pkg of newPackages) {
			references.push({ path: `packages/${pkg.name}` });
		}

		for (const app of newApps) {
			references.push({ path: `apps/${app.name}` });
		}

		tsConfig.references = references;
		await writeJsonFile(tsConfigPath, tsConfig);
	} catch {
		// If tsconfig.json doesn't exist or is invalid, create a basic one
		const tsConfig = {
			files: [],
			references: [
				...newPackages.map((pkg) => ({ path: `packages/${pkg.name}` })),
				...newApps.map((app) => ({ path: `apps/${app.name}` })),
			],
		};
		await writeJsonFile(tsConfigPath, tsConfig);
	}
}

function getTemplateChoices(
	config: TemplatesConfig,
	type: "apps" | "packages",
): Array<{ title: string; description: string; value: { category: string; template: string | null } }> {
	const choices: Array<{ title: string; description: string; value: { category: string; template: string | null } }> =
		[];

	choices.push({
		title: "Blank Template",
		description: "Empty template with basic TypeScript setup",
		value: { category: "blank", template: "blank" },
	});

	for (const [categoryKey, category] of Object.entries(config.categories)) {
		if (categoryKey === "blank") continue;
		if (type === "apps" && categoryKey === "packages") continue;
		if (type === "packages" && categoryKey !== "packages") continue;

		choices.push({
			title: category.name,
			description: category.description,
			value: { category: categoryKey, template: null },
		});
	}

	return choices;
}

function getCategoryTemplateChoices(
	config: TemplatesConfig,
	categoryKey: string,
): Array<{ title: string; description: string; value: string }> {
	const category = config.categories[categoryKey];
	if (!category) throw new Error(`Category '${categoryKey}' not found in templates config`);

	return Object.entries(category.templates).map(([templateKey, template]) => ({
		title: template.name,
		description: template.description,
		value: templateKey,
	}));
}

async function createOrmSetup(rootPath: string, orm: OrmConfig): Promise<void> {
	if (orm.type === "drizzle") {
		await createDrizzleSetup(rootPath, orm.database);
	} else if (orm.type === "prisma") {
		await createPrismaSetup(rootPath, orm.database);
	}
}

async function createDrizzleSetup(rootPath: string, database: "postgresql" | "mysql" | "sqlite"): Promise<void> {
	const { mkdir, writeFile } = await import("node:fs/promises");

	await mkdir(join(rootPath, "src", "lib"), { recursive: true });

	const dbContent = getDrizzleDbContent(database);
	await writeFile(join(rootPath, "src", "lib", "db.ts"), dbContent, { encoding: "utf-8" });

	const schemaContent = getDrizzleSchemaContent(database);
	await writeFile(join(rootPath, "src", "lib", "schema.ts"), schemaContent, { encoding: "utf-8" });

	const configContent = getDrizzleConfigContent(database);
	await writeFile(join(rootPath, "drizzle.config.ts"), configContent, { encoding: "utf-8" });

	const envContent = getDrizzleEnvContent(database);
	await writeFile(join(rootPath, ".env.example"), envContent, { encoding: "utf-8" });
}

async function createPrismaSetup(rootPath: string, database: "postgresql" | "mysql" | "sqlite"): Promise<void> {
	const { mkdir, writeFile } = await import("node:fs/promises");

	await mkdir(join(rootPath, "src", "lib"), { recursive: true });

	const clientContent = getPrismaClientContent();
	await writeFile(join(rootPath, "src", "lib", "db.ts"), clientContent, { encoding: "utf-8" });

	await mkdir(join(rootPath, "prisma"), { recursive: true });
	const schemaContent = getPrismaSchemaContent(database);
	await writeFile(join(rootPath, "prisma", "schema.prisma"), schemaContent, { encoding: "utf-8" });

	const seedContent = getPrismaSeedContent().replace('from "./client"', 'from "./db"');
	await writeFile(join(rootPath, "src", "lib", "seed.ts"), seedContent, { encoding: "utf-8" });

	const envContent = getPrismaEnvContent(database);
	await writeFile(join(rootPath, ".env.example"), envContent, { encoding: "utf-8" });
}

export async function addSinglePackage(packageName?: string, packageTemplate?: string): Promise<void> {
	console.log(chalk.blue("📦 Add Package"));
	console.log(chalk.gray("Add a single package to your existing Bun monorepo\n"));

	// Validate we're in a Bun monorepo
	const monorepoInfo = await validateMonorepoStructure();

	if (!monorepoInfo) {
		console.log(chalk.red("❌ Not a valid Bun monorepo"));
		console.log(chalk.gray("This command must be run from the root of a Bun monorepo."));
		process.exit(1);
	}

	console.log(chalk.green("✅ Valid Bun monorepo detected"));
	console.log(chalk.gray(`📁 Root: ${monorepoInfo.rootPath}\n`));

	const templateConfig = getTemplateConfig();

	// If packageName is provided, use it directly
	let packageToAdd: PackageTemplate;

	if (packageName) {
		// If template is specified, use it directly
		if (packageTemplate) {
			// Validate the template exists
			const packageChoices = getPackageTemplateChoices(templateConfig);
			const foundChoice = packageChoices.find((choice) => choice.value === packageTemplate);

			if (!foundChoice) {
				console.log(chalk.red(`❌ Package template '${packageTemplate}' not found`));
				console.log(chalk.gray("Available package templates:"));
				for (const choice of packageChoices) {
					console.log(chalk.gray(`  - ${choice.value}`));
				}
				process.exit(1);
			}

			packageToAdd = {
				name: packageName,
				template: packageTemplate,
				category: "packages",
			};
		} else {
			// Try to find it as a template first, otherwise create as blank
			const packageChoices = getPackageTemplateChoices(templateConfig);
			const foundChoice = packageChoices.find((choice) => choice.value === packageName);

			if (foundChoice) {
				packageToAdd = {
					name: packageName,
					template: packageName,
					category: "packages",
				};
			} else {
				// Create as blank package
				console.log(chalk.yellow(`Package template '${packageName}' not found. Creating as blank package.`));
				packageToAdd = {
					name: packageName,
					template: "blank",
					category: "blank",
				};
			}
		}
	} else {
		// Interactive mode - ask for package type
		const packageTypeResponse = await prompts({
			type: "select",
			name: "packageType",
			message: "What type of package would you like to add?",
			choices: [
				{ title: "Template Package", value: "template", description: "Choose from pre-built package templates" },
				{ title: "Blank Package", value: "blank", description: "Create a custom blank package" },
			],
		});

		if (!packageTypeResponse.packageType) {
			process.exit(0);
		}

		if (packageTypeResponse.packageType === "template") {
			// Select from template packages
			const templateResponse = await prompts({
				type: "select",
				name: "selectedTemplate",
				message: "Select a package template:",
				choices: getPackageTemplateChoices(templateConfig),
			});

			if (!templateResponse.selectedTemplate) {
				process.exit(0);
			}

			packageToAdd = {
				name: templateResponse.selectedTemplate,
				template: templateResponse.selectedTemplate,
				category: "packages",
			};
		} else {
			// Create blank package
			const nameResponse = await prompts({
				type: "text",
				name: "packageName",
				message: "Enter the package name:",
				validate: (value: string) => (value.trim() ? true : "Package name is required"),
			});

			if (!nameResponse.packageName) {
				process.exit(0);
			}

			packageToAdd = {
				name: nameResponse.packageName.trim(),
				template: "blank",
				category: "blank",
			};
		}
	}

	// Create the package
	await addSinglePackageToMonorepo(monorepoInfo, packageToAdd);

	console.log(chalk.green(`\n✅ Successfully added package: ${packageToAdd.name}`));
	console.log(chalk.gray("📦 Run the following commands to finalize:"));
	console.log(chalk.yellow("  bun install"));
}

export async function addSingleApp(appName?: string, appTemplateName?: string): Promise<void> {
	console.log(chalk.blue("🚀 Add App"));
	console.log(chalk.gray("Add a single app to your existing Bun monorepo\n"));

	// Validate we're in a Bun monorepo
	const monorepoInfo = await validateMonorepoStructure();

	if (!monorepoInfo) {
		console.log(chalk.red("❌ Not a valid Bun monorepo"));
		console.log(chalk.gray("This command must be run from the root of a Bun monorepo."));
		process.exit(1);
	}

	console.log(chalk.green("✅ Valid Bun monorepo detected"));
	console.log(chalk.gray(`📁 Root: ${monorepoInfo.rootPath}\n`));

	// Get app name
	let finalAppName: string;
	if (appName) {
		finalAppName = appName;
	} else {
		const nameResponse = await prompts({
			type: "text",
			name: "appName",
			message: "Enter the app name:",
			validate: (value: string) => (value.trim() ? true : "App name is required"),
		});

		if (!nameResponse.appName) {
			process.exit(0);
		}

		finalAppName = nameResponse.appName.trim();
	}

	const templateConfig = getTemplateConfig();

	let appTemplate: AppTemplate;

	if (appTemplateName) {
		// Try to find the template in any category
		let foundTemplate: { template: string; category: string } | undefined;

		for (const [categoryKey, category] of Object.entries(templateConfig.categories)) {
			if (categoryKey === "packages") continue; // Skip package templates

			if (category.templates[appTemplateName]) {
				foundTemplate = { template: appTemplateName, category: categoryKey };
				break;
			}
		}

		if (!foundTemplate) {
			console.log(chalk.red(`❌ App template '${appTemplateName}' not found`));
			console.log(chalk.gray("Available app templates:"));
			for (const [categoryKey, category] of Object.entries(templateConfig.categories)) {
				if (categoryKey === "packages") continue;
				for (const templateKey of Object.keys(category.templates)) {
					console.log(chalk.gray(`  - ${templateKey} (${category.name})`));
				}
			}
			process.exit(1);
		}

		appTemplate = {
			name: finalAppName,
			template: foundTemplate.template,
			category: foundTemplate.category,
		};
	} else {
		// Interactive template selection
		appTemplate = await promptAppTemplate(finalAppName, templateConfig);
	}

	// Create the app
	await addSingleAppToMonorepo(monorepoInfo, appTemplate);

	console.log(chalk.green(`\n✅ Successfully added app: ${appTemplate.name}`));
	console.log(chalk.gray("📦 Run the following commands to finalize:"));
	console.log(chalk.yellow("  bun install"));
}

export async function addOrmSetup(): Promise<void> {
	console.log(chalk.blue("🗄️ Add ORM Setup"));
	console.log(chalk.gray("Add database ORM configuration to your existing Bun monorepo\n"));

	// Validate we're in a Bun monorepo
	const monorepoInfo = await validateMonorepoStructure();

	if (!monorepoInfo) {
		console.log(chalk.red("❌ Not a valid Bun monorepo"));
		console.log(chalk.gray("This command must be run from the root of a Bun monorepo."));
		process.exit(1);
	}

	if (monorepoInfo.hasOrmSetup) {
		console.log(chalk.yellow("⚠️ ORM setup already detected"));
		console.log(chalk.gray("This monorepo appears to already have ORM configuration."));

		const confirmResponse = await prompts({
			type: "confirm",
			name: "continue",
			message: "Do you want to continue and potentially overwrite existing ORM setup?",
			initial: false,
		});

		if (!confirmResponse.continue) {
			console.log(chalk.gray("Operation cancelled."));
			process.exit(0);
		}
	}

	console.log(chalk.green("✅ Valid Bun monorepo detected"));
	console.log(chalk.gray(`📁 Root: ${monorepoInfo.rootPath}\n`));

	const ormConfig = await promptOrmSetup();

	// Add ORM setup
	await addOrmToMonorepo(monorepoInfo, ormConfig);

	console.log(chalk.green("\n✅ Successfully added ORM setup!"));
	console.log(chalk.gray("📦 Run the following commands to finalize:"));
	console.log(chalk.yellow("  bun install"));

	if (ormConfig.type === "prisma") {
		console.log(chalk.yellow("  bunx prisma generate"));
		console.log(chalk.yellow("  bunx prisma db push"));
	} else if (ormConfig.type === "drizzle") {
		console.log(chalk.yellow("  bunx drizzle-kit generate"));
		console.log(chalk.yellow("  bunx drizzle-kit migrate"));
	}
}

async function addSinglePackageToMonorepo(
	monorepoInfo: MonorepoStructure,
	packageToAdd: PackageTemplate,
): Promise<void> {
	const { rootPath } = monorepoInfo;

	// Create packages directory if needed
	if (!monorepoInfo.hasPackagesDir) {
		await mkdir(join(rootPath, "packages"), { recursive: true });
	}

	// Update package.json workspaces
	await updatePackageJsonForSinglePackage(monorepoInfo);

	// Create the package
	await createPackage(rootPath, packageToAdd);

	// Update TypeScript references
	await updateTsConfigReferences(monorepoInfo, [], [packageToAdd]);
}

async function addSingleAppToMonorepo(monorepoInfo: MonorepoStructure, appToAdd: AppTemplate): Promise<void> {
	const { rootPath } = monorepoInfo;

	// Create apps directory if needed
	if (!monorepoInfo.hasAppsDir) {
		await mkdir(join(rootPath, "apps"), { recursive: true });
	}

	// Update package.json workspaces
	await updatePackageJsonForSingleApp(monorepoInfo);

	// Create the app
	await createApp(rootPath, appToAdd, monorepoInfo.packages, undefined, []);

	// Update TypeScript references
	await updateTsConfigReferences(monorepoInfo, [appToAdd], []);
}

async function addOrmToMonorepo(monorepoInfo: MonorepoStructure, ormConfig: OrmConfig): Promise<void> {
	const { rootPath } = monorepoInfo;

	// Ensure packages directory exists for db package
	if (!monorepoInfo.hasPackagesDir) {
		await mkdir(join(rootPath, "packages"), { recursive: true });
	}

	// Update package.json with ORM dependencies
	await updatePackageJsonWithOrmDeps(monorepoInfo, ormConfig);

	// Create ORM setup (this will create the db package)
	await createOrmSetup(rootPath, ormConfig);
	await addDockerCompose(rootPath, ormConfig);

	// Add db package to TypeScript references
	const dbPackage: PackageTemplate = {
		name: "db",
		template: "db",
		category: "packages",
	};
	await updateTsConfigReferences(monorepoInfo, [], [dbPackage]);
}

async function updatePackageJsonForSinglePackage(monorepoInfo: MonorepoStructure): Promise<void> {
	const { rootPath, packageJson } = monorepoInfo;

	const workspaces = new Set(packageJson.workspaces || []);

	if (monorepoInfo.hasAppsDir) {
		workspaces.add("apps/*");
	}

	workspaces.add("packages/*");

	packageJson.workspaces = Array.from(workspaces);
	await writeJsonFile(join(rootPath, "package.json"), packageJson);
}

async function updatePackageJsonForSingleApp(monorepoInfo: MonorepoStructure): Promise<void> {
	const { rootPath, packageJson } = monorepoInfo;

	const workspaces = new Set(packageJson.workspaces || []);

	workspaces.add("apps/*");

	if (monorepoInfo.hasPackagesDir) {
		workspaces.add("packages/*");
	}

	packageJson.workspaces = Array.from(workspaces);
	await writeJsonFile(join(rootPath, "package.json"), packageJson);
}

async function updatePackageJsonWithOrmDeps(monorepoInfo: MonorepoStructure, ormConfig: OrmConfig): Promise<void> {
	const { rootPath, packageJson } = monorepoInfo;

	const ormDeps = getOrmDependencies(ormConfig);
	const ormScripts = getOrmScripts(ormConfig);

	packageJson.dependencies = {
		...packageJson.dependencies,
		...ormDeps.dependencies,
	};

	packageJson.devDependencies = {
		...packageJson.devDependencies,
		...ormDeps.devDependencies,
	};

	packageJson.scripts = {
		...packageJson.scripts,
		...ormScripts,
	};

	await writeJsonFile(join(rootPath, "package.json"), packageJson);
}
