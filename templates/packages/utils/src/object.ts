/**
 * Object utility functions
 */

/**
 * Pick specific keys from an object
 */
export function pick<T extends Record<string | number | symbol, unknown>, K extends keyof T>(
	obj: T,
	keys: K[],
): Pick<T, K> {
	const result = {} as Pick<T, K>;
	keys.forEach((key) => {
		if (key in obj) {
			result[key] = obj[key];
		}
	});
	return result;
}

/**
 * Omit specific keys from an object
 */
export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
	const result = { ...obj } as Omit<T, K>;
	keys.forEach((key) => {
		// biome-ignore lint/suspicious/noExplicitAny: Required for dynamic property deletion
		delete (result as any)[key];
	});
	return result;
}

/**
 * Check if object is empty
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic empty check requires any
export function isEmpty(obj: any): boolean {
	if (obj === null || obj === undefined) return true;
	if (Array.isArray(obj)) return obj.length === 0;
	if (typeof obj === "object") return Object.keys(obj).length === 0;
	return false;
}

/**
 * Get nested value from object using dot notation
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic object access requires any
export function get(obj: any, path: string, defaultValue?: any): any {
	const keys = path.split(".");
	let result = obj;

	for (const key of keys) {
		if (result === null || result === undefined) {
			return defaultValue;
		}
		result = result[key];
	}

	return result !== undefined ? result : defaultValue;
}
