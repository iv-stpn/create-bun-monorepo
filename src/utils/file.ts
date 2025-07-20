/**
 * File system utilities for the scaffolder
 */

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { FileReplacements } from "../types";

/**
 * Stringify JSON with consistent formatting (tabs, compact arrays, double quotes, and trailing newline)
 */
function stringifyJson(obj: unknown, isPackageJson = false): string {
	// Use JSON.stringify with tab indentation
	let jsonString = JSON.stringify(obj, null, "\t");

	// Skip array compacting for package.json files to maintain conventional formatting
	if (!isPackageJson) {
		// Make arrays more compact by keeping simple arrays on one line
		jsonString = jsonString.replace(/\[\n\t+([^[\]{}]+)\n\t*\]/g, (match, content) => {
			// Only compact if it's a simple array (no nested objects/arrays)
			const items = content.split(",").map((item: string) => item.trim());
			const isSimple = items.every((item: string) => !item.includes("{") && !item.includes("[") && item.length < 50);

			if (isSimple && items.length <= 5) {
				return `[${content.replace(/\s+/g, " ").trim()}]`;
			}
			return match;
		});
	}

	return `${jsonString}\n`;
}

/**
 * Write JSON object to file with consistent formatting
 */
export async function writeJsonFile(path: string, obj: unknown): Promise<void> {
	try {
		// Check if this is a package.json file
		const isPackageJson = path.endsWith("package.json");
		await writeFile(path, stringifyJson(obj, isPackageJson), { encoding: "utf-8" });
	} catch (error) {
		throw new Error(`Failed to write JSON file ${path}: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Process template replacements in files recursively
 */
export async function processTemplateReplacements(targetPath: string, replacements: FileReplacements): Promise<void> {
	const processDirectory = async (dirPath: string): Promise<void> => {
		const entries = await readdir(dirPath);

		for (const entry of entries) {
			const fullPath = join(dirPath, entry);
			const stats = await stat(fullPath);

			if (stats.isDirectory()) {
				await processDirectory(fullPath);
			} else if (stats.isFile()) {
				await processTemplateFile(fullPath, replacements);
			}
		}
	};

	await processDirectory(targetPath);
}

/**
 * Process a single template file for replacements
 */
async function processTemplateFile(filePath: string, replacements: FileReplacements): Promise<void> {
	// Only process text files that might contain templates
	const ext = filePath.split(".").pop()?.toLowerCase();
	const textExtensions = ["json", "js", "ts", "tsx", "jsx", "md", "txt", "yml", "yaml", "xml", "html", "css", "scss"];

	if (!ext || !textExtensions.includes(ext)) {
		return;
	}

	try {
		let content = await readFile(filePath, "utf-8");
		let hasReplacements = false;

		// Apply all replacements
		for (const [placeholder, value] of Object.entries(replacements)) {
			const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, "g");
			if (content.includes(`{{${placeholder}}}`)) {
				content = content.replace(regex, value);
				hasReplacements = true;
			}
		}

		// Write back only if replacements were made
		if (hasReplacements) {
			// Ensure UTF-8 encoding and preserve tabs/whitespace
			await writeFile(filePath, content, { encoding: "utf-8" });
		}
	} catch (error) {
		// Log error but don't fail the entire process
		console.warn(
			`Warning: Could not process template file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
