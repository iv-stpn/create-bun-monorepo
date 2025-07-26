const { theme } = require("../../tailwind.base");

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./layouts/**/*.{js,ts,jsx,tsx,mdx}",
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme,
	plugins: [],
};
