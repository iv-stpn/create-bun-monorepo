/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	transpilePackages: [
		"nativewind",
		"react-native-css-interop",
		"react-native",
		"react-native-web",
		"solito",
		"react-native-reanimated",
		"react-native-gesture-handler",
		"react-native-screens",
		"react-native-safe-area-context",
	],
	webpack: (config) => {
		// Handle React Native modules for web
		config.resolve.alias = {
			...(config.resolve.alias || {}),
			"react-native$": "react-native-web",
		};

		// Handle React Native file extensions
		config.resolve.extensions = [".web.js", ".web.jsx", ".web.ts", ".web.tsx", ...config.resolve.extensions];

		return config;
	},
	experimental: {
		turbo: {
			rules: {
				"*.css": {
					loaders: ["css-loader"],
					as: "*.css",
				},
			},
		},
	},
};

module.exports = nextConfig;
