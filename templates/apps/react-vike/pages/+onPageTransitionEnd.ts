import type { OnPageTransitionEndSync } from "vike/types";

export const onPageTransitionEnd: OnPageTransitionEndSync = () => {
	console.log("Page transition end");
	document.querySelector("body")?.classList.remove("page-is-transitioning");
};
