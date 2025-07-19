/**
 * Utility functions for string manipulation and validation
 */

/**
 * Convert kebab-case to camelCase for variable names
 */
export function toCamelCase(str: string): string {
	return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
