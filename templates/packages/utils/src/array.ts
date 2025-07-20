/**
 * Array utility functions
 */

/**
 * Remove duplicates from array
 */
export function unique<T>(arr: T[]): T[] {
	return [...new Set(arr)];
}

/**
 * Remove duplicates from array by key
 */
export function uniqueBy<T>(arr: T[], key: keyof T): T[] {
	const seen = new Set();
	return arr.filter((item) => {
		const value = item[key];
		if (seen.has(value)) {
			return false;
		}
		seen.add(value);
		return true;
	});
}

/**
 * Group array by key
 */
export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
	return arr.reduce<Record<string, T[]>>((groups, item) => {
		const value = String(item[key]);
		if (!groups[value]) {
			groups[value] = [];
		}
		groups[value].push(item);
		return groups;
	}, {});
}

/**
 * Sort array by key
 */
export function sortBy<T>(arr: T[], key: keyof T, direction: "asc" | "desc" = "asc"): T[] {
	return [...arr].sort((a, b) => {
		const aVal = a[key];
		const bVal = b[key];

		if (aVal < bVal) return direction === "asc" ? -1 : 1;
		if (aVal > bVal) return direction === "asc" ? 1 : -1;
		return 0;
	});
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(arr: T[], size: number): T[][] {
	if (size <= 0) return [];

	const result: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		result.push(arr.slice(i, i + size));
	}
	return result;
}

/**
 * Flatten array of arrays
 */
export function flatten<T>(arr: T[][]): T[] {
	return arr.reduce((acc, val) => acc.concat(val), []);
}

/**
 * Deep flatten array
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic array flattening requires any
export function deepFlatten(arr: any[]): any[] {
	return arr.reduce((acc, val) => {
		if (Array.isArray(val)) {
			return acc.concat(deepFlatten(val));
		}
		return acc.concat(val);
	}, []);
}

/**
 * Get random element from array
 */
export function randomElement<T>(arr: T[]): T | undefined {
	if (arr.length === 0) return undefined;
	return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffle array
 */
export function shuffle<T>(arr: T[]): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		// @ts-expect-error - unchecked index access
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * Get intersection of two arrays
 */
export function intersection<T>(arr1: T[], arr2: T[]): T[] {
	return arr1.filter((item) => arr2.includes(item));
}

/**
 * Get difference between two arrays
 */
export function difference<T>(arr1: T[], arr2: T[]): T[] {
	return arr1.filter((item) => !arr2.includes(item));
}

/**
 * Check if array has no elements
 */
export function isEmptyArray<T>(arr: T[]): boolean {
	return arr.length === 0;
}

/**
 * Get first element of array
 */
export function first<T>(arr: T[]): T | undefined {
	return arr[0];
}

/**
 * Get last element of array
 */
export function last<T>(arr: T[]): T | undefined {
	return arr[arr.length - 1];
}

/**
 * Take first n elements
 */
export function take<T>(arr: T[], n: number): T[] {
	return arr.slice(0, n);
}

/**
 * Drop first n elements
 */
export function drop<T>(arr: T[], n: number): T[] {
	return arr.slice(n);
}

/**
 * Sum array of numbers
 */
export function sum(arr: number[]): number {
	return arr.reduce((sum, num) => sum + num, 0);
}

/**
 * Get average of array of numbers
 */
export function average(arr: number[]): number {
	return arr.length > 0 ? sum(arr) / arr.length : 0;
}

/**
 * Get minimum value from array
 */
export function min(arr: number[]): number | undefined {
	return arr.length > 0 ? Math.min(...arr) : undefined;
}

/**
 * Get maximum value from array
 */
export function max(arr: number[]): number | undefined {
	return arr.length > 0 ? Math.max(...arr) : undefined;
}
