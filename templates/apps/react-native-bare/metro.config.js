const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");
const path = require("node:path");

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;
const originalResolveRequest = defaultConfig.resolver.resolveRequest;

const ALIASES = {
	tslib: path.resolve(__dirname, "../../node_modules/tslib/tslib.es6.js"),
};

const config = mergeConfig(defaultConfig, {
	transformer: {
		babelTransformerPath: require.resolve("react-native-svg-transformer/react-native"),
	},
	resolver: {
		assetExts: assetExts.filter((ext) => ext !== "svg"),
		sourceExts: [...sourceExts, "svg"],
	},
	nodeModulesPaths: [
		path.resolve(__dirname, "node_modules"),
		path.resolve(__dirname, "../../node_modules"), // Look for modules in monorepo root
	],
	resolveRequest: (context, moduleName, platform) => {
		const resolvedModuleName = ALIASES[moduleName] ?? moduleName;
		return originalResolveRequest
			? originalResolveRequest(context, resolvedModuleName, platform)
			: context.resolveRequest(context, resolvedModuleName, platform);
	},
});

// Wrap with NativeWind and Reanimated
module.exports = wrapWithReanimatedMetroConfig(withNativeWind(config, { input: "./global.css" }));
