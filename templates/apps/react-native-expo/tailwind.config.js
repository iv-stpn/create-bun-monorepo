const { theme } = require("../../tailwind.base");

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
	theme,
	plugins: [],
	presets: [require("nativewind/preset")],
};
