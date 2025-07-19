/**
 * String utility functions
 */

/**
 * Convert string to camelCase
 */
export function toCamelCase(str: string): string {
	return str
		.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
			return index === 0 ? word.toLowerCase() : word.toUpperCase();
		})
		.replace(/\s+/g, "");
}

/**
 * Convert string to PascalCase
 */
export function toPascalCase(str: string): string {
	return str
		.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
			return word.toUpperCase();
		})
		.replace(/\s+/g, "");
}

/**
 * Convert string to kebab-case
 */
export function toKebabCase(str: string): string {
	return str
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/\s+/g, "-")
		.toLowerCase();
}

/**
 * Convert string to snake_case
 */
export function toSnakeCase(str: string): string {
	return str
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replace(/\s+/g, "_")
		.toLowerCase();
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, length: number, suffix: string = "..."): string {
	if (str.length <= length) return str;
	return str.substring(0, length) + suffix;
}

/**
 * Remove HTML tags from string
 */
export function stripHtml(str: string): string {
	return str.replace(/<[^>]*>/g, "");
}

/**
 * Generate random string
 */
export function randomString(length: number = 10): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

/**
 * Check if string is valid email
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
	return EMAIL_REGEX.test(email);
}

/**
 * Check if string is valid URL
 */
export function isValidUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

/**
 * Extract initials from name
 */
export function getInitials(name: string): string {
	return name
		.split(" ")
		.map((word) => word.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

/**
 * Slugify string for URLs
 */
export function slugify(str: string): string {
	return str
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
