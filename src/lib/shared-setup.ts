import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rootPath } from "../constants";
import { addOrmEndpoints, injectUIComponentDemos } from "../injections";
import type { TemplatesConfig } from "../templates";
import { getTemplateConfig, NATIVE_FRAMEWORKS, ORM_FRAMEWORKS, REACT_FRAMEWORKS } from "../templates";
import type { AppTemplate, OrmConfig, PackageTemplate } from "../types";
import { processTemplateReplacements, writeJsonFile } from "../utils/file";
import { toCamelCase } from "../utils/string";

// Get current file directory for template path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Find a template in the configuration
 */
export function findTemplateInConfig(
	config: TemplatesConfig,
	templateName: string,
	type: "apps" | "packages",
): { category: string } | null {
	// Handle blank template specially
	if (templateName === "blank") return { category: "blank" };

	for (const [categoryKey, category] of Object.entries(config.categories)) {
		// For apps, exclude packages category and vice versa
		if (type === "apps" && categoryKey === "packages") continue;
		if (type === "packages" && categoryKey !== "packages") continue;

		if (category.templates?.[templateName]) return { category: categoryKey };
	}
	return null;
}

/**
 * Get available templates for a specific type
 */
export function getAvailableTemplates(config: TemplatesConfig, type: "apps" | "packages"): string[] {
	const templates: string[] = [];

	for (const [categoryKey, category] of Object.entries(config.categories)) {
		// For apps, exclude packages category and vice versa
		if (type === "apps" && categoryKey === "packages") continue;
		if (type === "packages" && categoryKey !== "packages") continue;

		if (category.templates) {
			templates.push(...Object.keys(category.templates));
		}
	}

	// Always add blank as an available template
	templates.push("blank");

	return templates;
}

/**
 * Copy template files from source to target
 */
async function copyTemplateFiles(
	template: string,
	category: string,
	targetPath: string,
	replacements?: Record<string, string>,
): Promise<void> {
	const templateConfig = getTemplateConfig();
	const templateInfo = templateConfig.categories[category]?.templates[template];

	if (!templateInfo?.path) throw new Error(`Template ${template} in category ${category} not found`);
	const templatePath = join(rootPath, "templates", templateInfo.path);

	// Copy all files except node_modules and dist
	await cp(templatePath, targetPath, {
		recursive: true,
		filter: (src) => {
			const relativePath = src.replace(templatePath, "");
			return !relativePath.includes("node_modules") && !relativePath.includes("dist");
		},
	});

	// If replacements are provided, process template files for content replacement
	if (replacements) {
		await processTemplateReplacements(targetPath, replacements);
	}
}

/**
 * Update package.json with correct name and dependencies
 */
async function updatePackageJson(
	targetPath: string,
	packageName: string,
	dependencyPackages: PackageTemplate[],
): Promise<void> {
	const packageJsonPath = join(targetPath, "package.json");

	// The package.json file should exist
	const packageJsonContent = await readFile(packageJsonPath, "utf-8");
	const packageJson = JSON.parse(packageJsonContent);

	// Update the name
	packageJson.name = packageName;

	// Add workspace dependencies if they exist
	if (dependencyPackages.length > 0) {
		const baseProjectName = packageName.split("/")[0]?.replace("@", "");

		packageJson.dependencies = {
			...packageJson.dependencies,
			...dependencyPackages.reduce<Record<string, string>>((acc, pkg) => {
				acc[`@${baseProjectName}/${pkg.name}`] = "workspace:*";
				return acc;
			}, {}),
		};
	}

	await writeJsonFile(packageJsonPath, packageJson);
}

/**
 * Create a blank app with basic structure
 */
async function createBlankApp(
	appPath: string,
	appName: string,
	projectName: string,
	packages: PackageTemplate[],
): Promise<void> {
	// Create package.json
	const packageJson = {
		name: `@${projectName}/${appName}`,
		version: "1.0.0",
		private: true,
		type: "module",
		scripts: {
			dev: "bun run --hot index.ts",
			build: "bun build index.ts --outdir dist --target node",
			start: "node dist/index.js",
		},
		dependencies: {
			...packages.reduce<Record<string, string>>((acc, pkg) => {
				acc[`@${projectName}/${pkg.name}`] = "workspace:*";
				return acc;
			}, {}),
		},
		devDependencies: {
			typescript: "^5",
			"bun-types": "latest",
		},
	};

	await writeJsonFile(join(appPath, "package.json"), packageJson);

	// Create TypeScript config
	const tsConfig = {
		extends: "../../tsconfig.base.json",
		compilerOptions: {
			outDir: "./dist",
			rootDir: "./src",
		},
		include: ["src/**/*", "index.ts"],
		exclude: ["node_modules", "dist"],
	};

	await writeJsonFile(join(appPath, "tsconfig.json"), tsConfig);

	// Create index file
	const availablePackages = packages.filter((pkg) => pkg.template === "blank");

	const showPackages =
		availablePackages.length > 0
			? `console.log("Available packages:", {
	${availablePackages.map((pkg) => `${toCamelCase(pkg.name)}: "${pkg.name}"`).join(",\n  ")},
});
`
			: "";

	const imports = availablePackages
		.map((pkg) => `// import { ${toCamelCase(pkg.name)}Name } from "@${projectName}/${pkg.name}";`)
		.join("\n");

	const content = `${imports ? `${imports}\n\n` : ""}export const appName = "${appName}";

console.log("Blank App:", appName);
${showPackages}`;

	await writeFile(join(appPath, "index.ts"), content);
}

/**
 * Create a blank package with basic structure
 */
async function createBlankPackage(pkgPath: string, pkgName: string): Promise<void> {
	// Extract just the package name from the scoped name (@project/package-name -> package-name)
	const packageName = pkgName.includes("/") ? pkgName.split("/").pop() || pkgName : pkgName;

	// Create package.json
	const packageJson = {
		name: pkgName, // This will be the full scoped name
		version: "1.0.0",
		private: true,
		type: "module",
		main: "index.ts",
		scripts: {
			build: "bun build index.ts --outdir dist --target node",
			dev: "bun run --hot index.ts",
		},
		devDependencies: {
			typescript: "^5",
			"bun-types": "latest",
		},
	};

	await writeJsonFile(join(pkgPath, "package.json"), packageJson);

	// Create TypeScript config
	const tsConfig = {
		extends: "../../tsconfig.base.json",
		compilerOptions: {
			outDir: "./dist",
		},
		include: ["src/**/*", "index.ts"],
		exclude: ["node_modules", "dist"],
	};

	await writeJsonFile(join(pkgPath, "tsconfig.json"), tsConfig);

	// Create index file with proper variable naming
	const camelCaseName = toCamelCase(packageName);
	const content = `export const ${camelCaseName}Name = "${packageName}";

console.log("Blank Package:", ${camelCaseName}Name);
`;

	await writeFile(join(pkgPath, "index.ts"), content);
}

/**
 * Create an app with all necessary processing
 */
export async function createAppWithProcessing(
	projectName: string,
	app: AppTemplate,
	packages: PackageTemplate[],
	orm?: OrmConfig,
): Promise<void> {
	const appPath = join(projectName, "apps", app.name);
	await mkdir(appPath, { recursive: true });

	if (app.template !== "blank") {
		const replacements =
			app.template === "react-native-expo"
				? {
						appName: projectName,
						name: `${projectName}-${app.name}`,
					}
				: undefined;
		await copyTemplateFiles(app.template, app.category, appPath, replacements);

		// Add ORM endpoints if backend framework and ORM is configured
		if (orm && orm.type !== "none" && ORM_FRAMEWORKS.includes(app.template))
			await addOrmEndpoints(appPath, app.template, orm);
	} else {
		await createBlankApp(appPath, app.name, projectName, packages);
	}

	// Update package.json with the correct name
	await updatePackageJson(
		appPath,
		`@${projectName}/${app.name}`,
		packages.filter((pkg) => {
			if (NATIVE_FRAMEWORKS.includes(app.template) && pkg.template === "ui-native") return true;
			if ((REACT_FRAMEWORKS.includes(app.template) && pkg.template === "ui") || pkg.template === "hooks") return true;
			if (pkg.template === "utils" || pkg.template === "schemas") return true;
			return false;
		}),
	);

	// Inject UI component demos if applicable
	await injectUIComponentDemos(appPath, app, packages, projectName);
}

/**
 * Create a package with all necessary processing
 */
export async function createPackageWithProcessing(projectName: string, pkg: PackageTemplate): Promise<void> {
	const pkgPath = join(projectName, "packages", pkg.name);
	await mkdir(pkgPath, { recursive: true });

	if (pkg.template !== "blank") {
		await copyTemplateFiles(pkg.template, pkg.category, pkgPath);
		await updatePackageJson(pkgPath, `@${projectName}/${pkg.name}`, []);
	} else {
		await createBlankPackage(pkgPath, `@${projectName}/${pkg.name}`);
	}
}

/**
 * Get package template choices for prompts
 */
export function getPackageTemplateChoices(
	config: TemplatesConfig,
): Array<{ title: string; description: string; value: string }> {
	const choices: Array<{ title: string; description: string; value: string }> = [];

	// Get package templates from the packages category
	const packagesCategory = config.categories.packages;
	if (packagesCategory?.templates) {
		for (const [templateKey, template] of Object.entries(packagesCategory.templates)) {
			choices.push({
				title: `${templateKey} - ${template.name}`,
				description: template.description,
				value: templateKey,
			});
		}
	}

	return choices;
}
