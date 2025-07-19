import { useEffect, useState } from "react";

/**
 * Hook for tracking window dimensions
 */
export function useWindowSize() {
	const [windowSize, setWindowSize] = useState({
		width: typeof window !== "undefined" ? window.innerWidth : 0,
		height: typeof window !== "undefined" ? window.innerHeight : 0,
	});

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		function handleResize() {
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight,
			});
		}

		window.addEventListener("resize", handleResize);
		handleResize();

		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return windowSize;
}

/**
 * Hook for media query matching
 */
export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const media = window.matchMedia(query);
		if (media.matches !== matches) {
			setMatches(media.matches);
		}

		const listener = () => setMatches(media.matches);
		media.addEventListener("change", listener);

		return () => media.removeEventListener("change", listener);
	}, [matches, query]);

	return matches;
}

/**
 * Hook for detecting mobile devices
 */
export function useIsMobile(): boolean {
	return useMediaQuery("(max-width: 768px)");
}

/**
 * Hook for detecting tablet devices
 */
export function useIsTablet(): boolean {
	return useMediaQuery("(min-width: 768px) and (max-width: 1024px)");
}

/**
 * Hook for detecting desktop devices
 */
export function useIsDesktop(): boolean {
	return useMediaQuery("(min-width: 1024px)");
}
