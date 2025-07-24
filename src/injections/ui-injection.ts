import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";

import type { AppTemplate, PackageTemplate } from "../types";

// Regex patterns for UI injection
const REACT_IMPORT_REGEX = /import { useState } from "react";/;
const REACT_BUTTON_REGEX = /<button type="button" onClick=\{[^}]+\}>\s*count is \{count\}\s*<\/button>/;
const WEBPACK_BUTTON_REGEX = /<button\s+[^>]*onClick=\{[^}]+\}[^>]*>\s*Count: \{count\}\s*<\/button>/;

// Solito/Next.js Solito patterns
const SOLITO_LINK_REGEX = /import { Link } from "solito\/link";/;
const SOLITO_HOME_REGEX = /export default function Home\(\) \{/;
const SOLITO_DIV_REGEX = /<div className="flex gap-4 justify-center">/;

// React Router v7 patterns
const REACT_ROUTER_INDEX_REGEX = /export function Welcome\(\) \{\s*return \(/;
const REACT_ROUTER_UL_REGEX = /<ul>/;

// React Native patterns
const RN_TOUCHABLE_REGEX =
	/<TouchableOpacity[^>]*onPress=\{[^}]+\}[^>]*>\s*<Text[^>]*>Count: \{count\}<\/Text>\s*<\/TouchableOpacity>/;

/**
 * Inject UI component demonstrations into frontend app templates
 */
export async function injectUIComponentDemos(
	appPath: string,
	app: AppTemplate,
	packages: PackageTemplate[],
	projectName: string,
): Promise<void> {
	const hasUIPackage = packages.some((pkg) => pkg.template === "ui");
	const hasUINativePackage = packages.some((pkg) => pkg.template === "ui-native");

	if (!hasUIPackage && !hasUINativePackage) return;

	// Handle different app types
	switch (app.template) {
		case "react-vite":
		case "react-webpack":
			if (hasUIPackage) {
				await injectReactUIDemo(appPath, projectName);
			}
			break;
		case "nextjs":
			if (hasUIPackage) {
				await injectNextJSUIDemo(appPath, projectName);
			}
			break;
		case "nextjs-solito":
			if (hasUINativePackage) {
				await injectNextJSSolitoUIDemo(appPath, projectName);
			}
			break;
		case "react-router":
			if (hasUIPackage) {
				await injectReactRouterUIDemo(appPath, projectName);
			}
			break;
		case "react-native-expo":
		case "react-native-bare":
			if (hasUINativePackage) {
				await injectReactNativeUIDemo(appPath, projectName);
			}
			break;
	}
}

/**
 * Inject UI component demo into React (Vite/Webpack) apps (with error handling)
 */
async function injectReactUIDemo(appPath: string, projectName: string): Promise<void> {
	const appFilePath = join(appPath, "src", "App.tsx");
	try {
		const content = await readFile(appFilePath, "utf-8");

		const updatedContent = content
			.replace(
				REACT_IMPORT_REGEX,
				`import { Button } from "@${projectName}/ui";
import { useState } from "react";`,
			)
			.replace(REACT_BUTTON_REGEX, `<Button onClick={() => setCount((count) => count + 1)}>count is {count}</Button>`);

		await writeFile(appFilePath, updatedContent, "utf-8");
	} catch (error) {
		console.warn(chalk.yellow(`Warning: Could not inject UI demo into ${appFilePath}: ${error}`));
	}
}

/**
 * Inject UI component demo into Next.js apps
 */
async function injectNextJSUIDemo(appPath: string, projectName: string): Promise<void> {
	const pageFilePath = join(appPath, "src", "app", "page.tsx");
	try {
		const content = await readFile(pageFilePath, "utf-8");

		const updatedContent = content
			.replace(
				REACT_IMPORT_REGEX,
				`import { Button } from "@${projectName}/ui";
import { useState } from "react";`,
			)
			.replace(WEBPACK_BUTTON_REGEX, `<Button onClick={() => setCount(count + 1)}>Count: {count}</Button>`);

		await writeFile(pageFilePath, updatedContent, "utf-8");
	} catch (error) {
		console.warn(chalk.yellow(`Warning: Could not inject UI demo into ${pageFilePath}: ${error}`));
	}
}

/**
 * Inject UI component demo into Next.js + Solito apps
 */
async function injectNextJSSolitoUIDemo(appPath: string, projectName: string): Promise<void> {
	const pageFilePath = join(appPath, "src", "app", "page.tsx");
	try {
		const content = await readFile(pageFilePath, "utf-8");

		const updatedContent = content
			.replace(
				SOLITO_LINK_REGEX,
				`import { Button } from "@${projectName}/ui-native";
import { useState } from "react";
import { Link } from "solito/link";`,
			)
			.replace(
				SOLITO_HOME_REGEX,
				`export default function Home() {
	const [count, setCount] = useState(0);`,
			)
			.replace(
				SOLITO_DIV_REGEX,
				`<div className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">UI Component Demo</h2>
					<Button onPress={() => setCount(count + 1)}>Count: {count}</Button>
				</div>

				<div className="flex gap-4 justify-center">`,
			);

		await writeFile(pageFilePath, updatedContent, "utf-8");
	} catch (_error) {
		console.warn(chalk.yellow(`Warning: Could not inject UI-Native demo into ${pageFilePath}`));
	}
}

/**
 * Inject UI component demo into React Router apps
 */
async function injectReactRouterUIDemo(appPath: string, projectName: string): Promise<void> {
	const indexFilePath = join(appPath, "app", "welcome", "welcome.tsx");
	try {
		const content = await readFile(indexFilePath, "utf-8");

		const updatedContent = content
			.replace(
				"",
				`import { Button } from "@${projectName}/ui";
import { useState } from "react";
`,
			)
			.replace(
				REACT_ROUTER_INDEX_REGEX,
				`export function Welcome() {
	const [count, setCount] = useState(0);

	return (`,
			)
			.replace(
				REACT_ROUTER_UL_REGEX,
				`<div style={{ marginBottom: "2rem" }}>
							<h2>UI Component Demo</h2>
							<Button onClick={() => setCount((count) => count + 1)}>Count is {count}</Button>
						</div>
						<ul>`,
			);

		await writeFile(indexFilePath, updatedContent, "utf-8");
	} catch (_error) {
		console.warn(chalk.yellow(`Warning: Could not inject UI demo into ${indexFilePath}`));
	}
}

/**
 * Inject UI component demo into React Native apps
 */
async function injectReactNativeUIDemo(appPath: string, projectName: string): Promise<void> {
	// For React Native Expo
	let appFilePath = join(appPath, "app", "index.tsx");
	if (!(await fileExists(appFilePath))) {
		// For React Native Bare
		appFilePath = join(appPath, "App.tsx");
	}

	try {
		const content = await readFile(appFilePath, "utf-8");

		const updatedContent =
			`import { Button } from "@${projectName}/ui-native";\n` +
			content.replace(
				RN_TOUCHABLE_REGEX,
				`<TouchableOpacity onPress={() => setCount(count + 1)}>
						<Text>Count: {count}</Text>
					</TouchableOpacity>
					<Button onPress={() => setCount(count + 1)}>Count: {count}</Button>`,
			);

		await writeFile(appFilePath, updatedContent, "utf-8");
	} catch (_error) {
		console.warn(chalk.yellow(`Warning: Could not inject UI-Native demo into ${appFilePath}`));
	}
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
	try {
		await readFile(filePath);
		return true;
	} catch {
		return false;
	}
}
