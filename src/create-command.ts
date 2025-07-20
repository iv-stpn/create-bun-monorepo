import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import prompts from "prompts";
import { rootPath } from "./constants";
import { addDockerCompose } from "./injections";
import { createOrmConfig, createOrmSetup, getOrmDependencies, getOrmScripts } from "./lib/orm-setup";
import {
	createAppWithProcessing,
	createPackageWithProcessing,
	findTemplateInConfig,
	getAvailableTemplates,
	getPackageTemplateChoices,
} from "./lib/shared-setup";
import type { TemplatesConfig } from "./templates";
import { getTemplateConfig, ORM_FRAMEWORKS } from "./templates";
import type { AppTemplate, CreateOptions, OrmConfig, PackageTemplate } from "./types";
import { writeJsonFile } from "./utils/file";

// Regular expressions for parsing template specifications
const APP_TEMPLATE_REGEX = /^([^[]+)(?:\[([^\]]+)\])?$/;
const PACKAGE_TEMPLATE_REGEX = /^([^[]+)(?:\[([^\]]+)\])?$/;

export async function create() {
	console.log(chalk.blue("🚀 create-bun-monorepo"));
	console.log(chalk.gray("Let's create your new monorepo!\n"));

	const options = await promptUser();
	await createMonorepo(options);

	console.log(chalk.green("\n✅ Monorepo scaffolded successfully!"));
	console.log(chalk.gray(`📁 Created: ${options.appName}`));
	console.log(chalk.gray("📦 Run the following commands to get started:"));
	console.log(chalk.yellow(`  cd ${options.appName}`));
	console.log(chalk.yellow("  bun install"));
	if (options.linting !== "none") console.log(chalk.yellow("  bun run format"));
}

const isOrmType = (value: string | undefined): value is "prisma" | "drizzle" | "none" | undefined =>
	!value || ["prisma", "drizzle", "none"].includes(value);

const isDatabaseType = (value: string | undefined): value is "postgresql" | "mysql" | "sqlite" | undefined =>
	!value || ["postgresql", "mysql", "sqlite"].includes(value);

const isLintingType = (value: string | undefined): value is "biome" | "eslint-prettier" | "none" | undefined =>
	!value || ["biome", "eslint-prettier", "none"].includes(value);

async function promptUser(): Promise<CreateOptions> {
	// Check for non-interactive mode via environment variables
	const nonInteractive = process.env.NON_INTERACTIVE === "true";

	if (nonInteractive) {
		// Check the values of environment variables for non-interactive mode
		const lintingMode = process.env.LINTING;
		if (!isLintingType(lintingMode))
			throw new Error(`Invalid LINTING value: ${lintingMode}. Expected 'biome', 'eslint-prettier', or 'none'.`);

		const ormType = process.env.ORM_TYPE;
		if (!isOrmType(ormType))
			throw new Error(`Invalid ORM_TYPE value: ${ormType}. Expected 'prisma', 'drizzle', or 'none'.`);

		const database = process.env.DATABASE;
		if (!isDatabaseType(database))
			throw new Error(`Invalid DATABASE value: ${database}. Expected 'postgresql', 'mysql', or 'sqlite'.`);

		// In non-interactive mode, parse templates from square brackets
		const templateConfig = getTemplateConfig();
		const appInputs = (process.env.APPS || "web,api").split(",").map((app) => app.trim());
		const packageInputs = process.env.PACKAGES ? process.env.PACKAGES.split(",").map((pkg) => pkg.trim()) : [];
		const additionalPackageInputs = process.env.ADDITIONAL_PACKAGES
			? process.env.ADDITIONAL_PACKAGES.split(",").map((pkg) => pkg.trim())
			: [];

		// Parse app names and templates
		const apps = appInputs.map((input) => {
			const match = input.match(APP_TEMPLATE_REGEX);
			if (!match) throw new Error(`Invalid app format: ${input}. Expected format: name or name[template]`);

			const [, name, templateSpec] = match;
			if (!name) throw new Error(`Invalid app name: ${input}. Name cannot be empty.`);

			// No template specified, use blank
			if (!templateSpec) return { name, template: "blank", category: "blank" };

			// Find the template in the config
			const templateInfo = findTemplateInConfig(templateConfig, templateSpec, "apps");
			if (!templateInfo) {
				throw new Error(
					`Template '${templateSpec}' not found for apps. Available templates: ${getAvailableTemplates(templateConfig, "apps").join(", ")}`,
				);
			}

			return { name, template: templateSpec, category: templateInfo.category };
		});

		// Parse package names and templates
		const packages = packageInputs.map((input) => {
			const match = input.match(PACKAGE_TEMPLATE_REGEX);
			if (!match) throw new Error(`Invalid package format: ${input}. Expected format: name or name[template]`);

			const [, name, templateSpec] = match;
			if (!name) throw new Error(`Invalid package name: ${input}. Name cannot be empty.`);

			// No template specified, use blank
			if (!templateSpec) return { name, template: "blank", category: "blank" };

			// Find the template in the config
			const templateInfo = findTemplateInConfig(templateConfig, templateSpec, "packages");
			if (!templateInfo) {
				throw new Error(
					`Template '${templateSpec}' not found for packages. Available templates: ${getAvailableTemplates(templateConfig, "packages").join(", ")}`,
				);
			}

			return { name, template: templateSpec, category: templateInfo.category };
		});

		// Add additional blank packages
		for (const packageName of additionalPackageInputs) {
			packages.push({
				name: packageName,
				template: "blank",
				category: "blank",
			});
		}

		// Parse ORM configuration from environment variables
		let orm: OrmConfig | undefined;

		if (ormType && database) {
			orm = createOrmConfig(ormType, database);
		}

		return {
			appName: process.env.APP_NAME || "my-test-app",
			linting: lintingMode || "biome",
			apps,
			packages,
			orm,
		};
	}

	const templateConfig = getTemplateConfig();

	const response = await prompts([
		{
			type: "text",
			name: "appName",
			message: "What is the name of your app?",
			validate: (value: string) => (value.trim() ? true : "App name is required"),
		},
		{
			type: "select",
			name: "linting",
			message: "Which linting/formatting setup do you prefer?",
			choices: [
				{ title: "Biome (fast, all-in-one)", value: "biome" },
				{ title: "ESLint + Prettier (traditional)", value: "eslint-prettier" },
				{ title: "None", value: "none" },
			],
		},
		{
			type: "text",
			name: "appsInput",
			message: "Enter app names (comma-separated):",
			validate: (value: string) => (value.trim() ? true : "At least one app name is required"),
		},
		{
			type: "multiselect",
			name: "selectedPackages",
			message: "Select packages to include (space to select, enter to confirm):",
			choices: getPackageTemplateChoices(templateConfig),
			instructions: false,
		},
	]);

	// Check if user cancelled
	if (!response.appName || !response.appsInput) {
		process.exit(0);
	}

	const appNames = response.appsInput
		.split(",")
		.map((app: string) => app.trim())
		.filter(Boolean);

	const selectedPackageTemplates = response.selectedPackages || [];

	// Prompt for app templates
	const apps: AppTemplate[] = [];
	for (const appName of appNames) {
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

			// Check if user cancelled
			if (!categoryResponse.category) {
				process.exit(0);
			}

			if (categoryResponse.category.template === null) {
				// User selected a category, now show templates within that category
				const templateChoices = getCategoryTemplateChoices(templateConfig, categoryResponse.category.category);

				// Add a "Go Back" option at the top of template choices
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

				// Check if user cancelled
				if (!templateResponse.template) {
					process.exit(0);
				}

				if (templateResponse.template === "__GO_BACK__") {
					// Go back to category selection
					continue;
				}

				selectedTemplate = {
					name: appName,
					template: templateResponse.template,
					category: categoryResponse.category.category,
				};
			} else {
				// User selected blank template directly
				selectedTemplate = {
					name: appName,
					template: categoryResponse.category.template,
					category: categoryResponse.category.category,
				};
			}
		}

		apps.push(selectedTemplate);
	}

	// Create packages directly from selected template keys
	const packages: PackageTemplate[] = selectedPackageTemplates.map((templateKey: string) => ({
		name: templateKey, // Use template key as package name
		template: templateKey,
		category: "packages",
	}));

	// Ask for additional blank packages
	const additionalPackagesResponse = await prompts({
		type: "text",
		name: "additionalPackages",
		message: "Enter the names of blank packages you want to add (comma-separated, optional):",
		initial: "",
	});

	// Add additional blank packages if provided
	if (additionalPackagesResponse.additionalPackages?.trim()) {
		const additionalPackageNames = additionalPackagesResponse.additionalPackages
			.split(",")
			.map((name: string) => name.trim())
			.filter(Boolean);

		for (const packageName of additionalPackageNames) {
			packages.push({
				name: packageName,
				template: "blank",
				category: "blank",
			});
		}
	}

	// Check if user has backend frameworks and prompt for ORM
	let orm: OrmConfig | undefined;
	// Ask for ORM setup if there are backend or full-stack frameworks
	if (apps.some((app) => ORM_FRAMEWORKS.includes(app.template))) {
		console.log(chalk.cyan("\n🗄️ Database Setup"));
		console.log(
			chalk.gray("You've selected backend or full-stack frameworks. Would you like to set up a database ORM?"),
		);

		const ormResponse = await prompts([
			{
				type: "select",
				name: "ormType",
				message: "Choose a database ORM:",
				choices: [
					{ title: "Drizzle ORM (lightweight, type-safe)", value: "drizzle" },
					{ title: "Prisma (full-featured, mature)", value: "prisma" },
					{ title: "None (no database setup)", value: "none" },
				],
			},
		]);

		if (ormResponse.ormType && ormResponse.ormType !== "none") {
			const databaseResponse = await prompts([
				{
					type: "select",
					name: "database",
					message: "Choose a database:",
					choices: [
						{ title: "PostgreSQL", value: "postgresql" },
						{ title: "SQLite", value: "sqlite" },
						{ title: "MySQL", value: "mysql" },
					],
				},
			]);

			if (databaseResponse.database) {
				orm = createOrmConfig(ormResponse.ormType, databaseResponse.database);
			}
		}
	}

	return {
		appName: response.appName.trim(),
		linting: response.linting,
		apps,
		packages,
		orm,
	};
}

async function createMonorepo(options: CreateOptions) {
	const { appName, linting, apps, packages, orm } = options;

	// Create root directory
	await mkdir(appName, { recursive: true });

	// Create subdirectories
	await mkdir(join(appName, "apps"), { recursive: true });
	if (packages.length > 0) await mkdir(join(appName, "packages"), { recursive: true });

	// Create root package.json
	await createRootPackageJson(appName, linting, apps, packages, orm);

	// Create TypeScript config
	await createRootTsConfig(appName, apps, packages);

	// Create linting configuration
	await createLintingConfig(appName, linting, apps, packages);

	// Create ORM setup if specified
	if (orm && orm.type !== "none") {
		await createOrmSetup(appName, orm);
		await addDockerCompose(appName, orm);
	}

	// Create .gitignore
	await createGitignore(appName, apps);

	// Create apps
	for (const app of apps) await createApp(appName, app, packages, orm);

	// Create packages
	for (const pkg of packages) await createPackage(appName, pkg);
}

async function createRootPackageJson(
	appName: string,
	linting: string,
	_apps: AppTemplate[],
	packages: PackageTemplate[],
	orm?: OrmConfig,
) {
	const ormDeps = orm ? getOrmDependencies(orm) : { dependencies: {}, devDependencies: {} };
	const ormScripts = orm ? getOrmScripts(orm) : {};

	const packageJson = {
		name: appName,
		version: "1.0.0",
		private: true,
		workspaces: ["apps/*", ...(packages.length > 0 ? ["packages/*"] : [])],
		scripts: {
			build: 'bun run --filter="*" build',
			dev: 'bun run --filter="*" dev',
			typecheck: "tsc --noEmit --pretty",
			...(linting === "biome" && {
				lint: "biome check .",
				"lint:fix": "biome check --apply .",
				format: "biome format --write .",
			}),
			...(linting === "eslint-prettier" && {
				lint: "eslint . --ext .js,.ts,.jsx,.tsx",
				"lint:fix": "eslint . --ext .js,.ts,.jsx,.tsx --fix",
				format: "prettier --write .",
			}),
			...ormScripts,
		},
		dependencies: {
			...ormDeps.dependencies,
		},
		devDependencies: {
			typescript: "^5",
			"@types/node": "^20",
			...(linting === "biome" && {
				"@biomejs/biome": "2.1.1",
			}),
			...(linting === "eslint-prettier" && {
				eslint: "^8.56.0",
				prettier: "^3.2.0",
				"@typescript-eslint/eslint-plugin": "^6.19.0",
				"@typescript-eslint/parser": "^6.19.0",
			}),
			...ormDeps.devDependencies,
		},
	};

	await writeJsonFile(join(appName, "package.json"), packageJson);
}

async function createRootTsConfig(appName: string, apps: AppTemplate[], packages: PackageTemplate[]) {
	const rootTsConfig = {
		files: [],
		references: [
			...packages.map((pkg) => ({ path: `packages/${pkg.name}` })),
			...apps.map((app) => ({ path: `apps/${app.name}` })),
		],
	};

	// Create tsconfig.json in the root
	await writeJsonFile(join(appName, "tsconfig.json"), rootTsConfig);

	// Copy base tsconfig for apps
	const baseTsConfigPath = join(rootPath, "templates", "tsconfig.base.json");
	const baseTsConfig = await readFile(baseTsConfigPath, "utf-8");
	await writeFile(join(appName, "tsconfig.base.json"), baseTsConfig, { encoding: "utf-8" });
}

async function createLintingConfig(
	appName: string,
	linting: string,
	apps: AppTemplate[],
	_packages: PackageTemplate[],
) {
	const ignoreContents = `${[
		"bun.lock",
		"node_modules",
		"dist",
		...(apps.some((app) => app.template.includes("nextjs")) ? [".next", "out"] : []),
		...(apps.some((app) => app.template.includes("remix")) ? ["build", ".cache"] : []),
	].join("\n")}\n`;

	if (linting === "biome") {
		// Copy the biome.json from the root as a template
		const rootBiomeConfigPath = join(rootPath, "biome.json");
		const vscodePath = join(rootPath, ".vscode");

		// Copy biome.json from root
		const biomeConfig = await readFile(rootBiomeConfigPath, "utf-8");
		await writeFile(join(appName, "biome.json"), biomeConfig, { encoding: "utf-8" });

		// Create .biomeignore file
		await writeFile(join(appName, ".biomeignore"), ignoreContents, { encoding: "utf-8" });

		// Copy .vscode directory with biome settings
		await cp(vscodePath, join(appName, ".vscode"), { recursive: true });
	} else if (linting === "eslint-prettier") {
		const eslintConfig = {
			extends: ["eslint:recommended", "@typescript-eslint/recommended"],
			parser: "@typescript-eslint/parser",
			env: {
				node: true,
				es2022: true,
			},
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
			},
			rules: {},
		};

		const prettierConfig = {
			semi: true,
			trailingComma: "es5",
			singleQuote: true,
			printWidth: 120,
			tabWidth: 2,
			useTabs: true,
		};

		await writeJsonFile(join(appName, ".eslintrc.json"), eslintConfig);
		await writeJsonFile(join(appName, ".prettierrc"), prettierConfig);
		await writeFile(join(appName, ".eslintignore"), ignoreContents, { encoding: "utf-8" });
		await writeFile(join(appName, ".prettierignore"), ignoreContents, { encoding: "utf-8" });
	}
}

async function createGitignore(appName: string, apps: AppTemplate[]) {
	const gitignore = [
		"node_modules/",
		"dist/",
		"build/",
		"*.log",
		".DS_Store",
		".env",
		...(apps.some((app) => app.template.includes("nextjs")) ? [".next/", "out/"] : []),
		...(apps.some((app) => app.template.includes("remix")) ? [".cache/"] : []),
	].join("\n");

	await writeFile(join(appName, ".gitignore"), `${gitignore}\n`, { encoding: "utf-8" });
}

async function createApp(appName: string, app: AppTemplate, packages: PackageTemplate[], orm?: OrmConfig) {
	await createAppWithProcessing(appName, app, packages, orm);
}

async function createPackage(appName: string, pkg: PackageTemplate) {
	await createPackageWithProcessing(appName, pkg);
}

// Helper function to get template choices for prompts
function getTemplateChoices(
	config: TemplatesConfig,
	type: "apps" | "packages",
): Array<{ title: string; description: string; value: { category: string; template: string | null } }> {
	const choices: Array<{ title: string; description: string; value: { category: string; template: string | null } }> =
		[];

	// Add blank option
	choices.push({
		title: "Blank Template",
		description: "Empty template with basic TypeScript setup",
		value: { category: "blank", template: "blank" },
	});

	// Add categorized templates
	for (const [categoryKey, category] of Object.entries(config.categories)) {
		if (categoryKey === "blank") continue;

		// For apps, exclude packages category and vice versa
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

// Helper function to get template choices within a category
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
