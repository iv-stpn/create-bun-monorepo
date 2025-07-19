import { useEffect, useRef, useState } from "react";

/**
 * Hook for managing boolean state with toggle functionality
 */
export function useToggle(initialValue: boolean = false): [boolean, () => void, (value: boolean) => void] {
	const [value, setValue] = useState(initialValue);

	const toggle = () => setValue((prev) => !prev);
	const set = (newValue: boolean) => setValue(newValue);

	return [value, toggle, set];
}

/**
 * Hook for managing counter state
 */
export function useCounter(initialValue: number = 0) {
	const [count, setCount] = useState(initialValue);

	const increment = () => setCount((prev) => prev + 1);
	const decrement = () => setCount((prev) => prev - 1);
	const reset = () => setCount(initialValue);
	const set = (value: number) => setCount(value);

	return { count, increment, decrement, reset, set };
}

/**
 * Hook for managing array state
 */
export function useArray<T>(initialArray: T[] = []) {
	const [array, setArray] = useState(initialArray);

	const push = (element: T) => setArray((prev) => [...prev, element]);
	const filter = (callback: (item: T) => boolean) => setArray((prev) => prev.filter(callback));
	const update = (index: number, newElement: T) =>
		setArray((prev) => [...prev.slice(0, index), newElement, ...prev.slice(index + 1)]);
	const remove = (index: number) => setArray((prev) => [...prev.slice(0, index), ...prev.slice(index + 1)]);
	const clear = () => setArray([]);

	return { array, set: setArray, push, filter, update, remove, clear };
}

/**
 * Hook for getting previous value
 */
export function usePrevious<T>(value: T): T | undefined {
	const ref = useRef<T | undefined>(undefined);

	useEffect(() => {
		ref.current = value;
	});

	return ref.current;
}

/**
 * Hook for managing form state
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic form handling requires any
export function useForm<T extends Record<string, any>>(initialValues: T) {
	const [values, setValues] = useState(initialValues);
	const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

	// biome-ignore lint/suspicious/noExplicitAny: Form values can be any type
	const handleChange = (name: keyof T, value: any) => {
		setValues((prev) => ({ ...prev, [name]: value }));
		// Clear error when user starts typing
		if (errors[name]) {
			setErrors((prev) => ({ ...prev, [name]: undefined }));
		}
	};

	const setError = (name: keyof T, error: string) => {
		setErrors((prev) => ({ ...prev, [name]: error }));
	};

	const clearErrors = () => setErrors({});
	const reset = () => {
		setValues(initialValues);
		setErrors({});
	};

	return {
		values,
		errors,
		handleChange,
		setError,
		clearErrors,
		reset,
		setValues,
	};
}
