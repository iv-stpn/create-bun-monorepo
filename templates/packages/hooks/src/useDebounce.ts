import { useEffect, useState } from "react";

/**
 * Hook for debouncing values
 */
export function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

/**
 * Hook for throttling values
 */
export function useThrottle<T>(value: T, delay: number): T {
	const [throttledValue, setThrottledValue] = useState<T>(value);

	useEffect(() => {
		let lastRan = 0;
		const handler = setTimeout(
			() => {
				if (Date.now() - lastRan >= delay) {
					setThrottledValue(value);
					lastRan = Date.now();
				}
			},
			delay - (Date.now() - lastRan),
		);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return throttledValue;
}
