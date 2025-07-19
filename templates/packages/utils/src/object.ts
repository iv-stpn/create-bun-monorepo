/**
 * Object utility functions
 */

/**
 * Deep merge two objects
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic object merging requires any
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
	const result = { ...target };

	for (const key in source) {
		if (Object.hasOwn(source, key)) {
			const sourceValue = source[key];
			const targetValue = result[key];

			if (
				typeof sourceValue === "object" &&
				sourceValue !== null &&
				!Array.isArray(sourceValue) &&
				typeof targetValue === "object" &&
				targetValue !== null &&
				!Array.isArray(targetValue)
			) {
				result[key] = deepMerge(targetValue, sourceValue);
			} else {
				result[key] = sourceValue;
			}
		}
	}

	return result;
}

/**
 * Pick specific keys from an object
 */
export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
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

/**
 * Set nested value in object using dot notation
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic object mutation requires any
export function set(obj: any, path: string, value: any): void {
	const keys = path.split(".");
	let current = obj;

	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (current[key] === undefined || current[key] === null) {
			current[key] = {};
		}
		current = current[key];
	}

	current[keys[keys.length - 1]] = value;
}
