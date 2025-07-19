import { useCallback, useEffect, useState } from "react";

/**
 * Hook for managing async operations
 */
export function useAsync<T, E = string>(asyncFunction: () => Promise<T>, immediate = true) {
	const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
	const [data, setData] = useState<T | null>(null);
	const [error, setError] = useState<E | null>(null);

	const execute = useCallback(async () => {
		setStatus("pending");
		setData(null);
		setError(null);

		try {
			const response = await asyncFunction();
			setData(response);
			setStatus("success");
		} catch (error) {
			setError(error as E);
			setStatus("error");
		}
	}, [asyncFunction]);

	useEffect(() => {
		if (immediate) {
			execute();
		}
	}, [immediate, execute]);

	return { execute, status, data, error };
}

/**
 * Hook for making HTTP requests
 */
export function useFetch<T>(url: string, options?: RequestInit) {
	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();

		const fetchData = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(url, {
					...options,
					signal: controller.signal,
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const result = await response.json();
				setData(result);
			} catch (err) {
				if (err instanceof Error && err.name !== "AbortError") {
					setError(err.message);
				}
			} finally {
				setLoading(false);
			}
		};

		fetchData();

		return () => {
			controller.abort();
		};
	}, [url, options]);

	return { data, loading, error };
}
