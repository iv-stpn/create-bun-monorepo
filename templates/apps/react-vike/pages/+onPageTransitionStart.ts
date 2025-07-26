import type { OnPageTransitionStartSync } from "vike/types";

export const onPageTransitionStart: OnPageTransitionStartSync = () => {
	console.log("Page transition start");
	document.querySelector("body")?.classList.add("page-is-transitioning");
};
