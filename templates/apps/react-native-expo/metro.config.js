const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");
const path = require("node:path");

const config = getDefaultConfig(__dirname);

const ALIASES = {
	tslib: path.resolve(__dirname, "../../node_modules/tslib/tslib.es6.js"),
};

config.resolver.nodeModulesPaths = [
	path.resolve(__dirname, "node_modules"),
	path.resolve(__dirname, "../../node_modules"),
];

config.transformer = {
	...config.transformer,
	babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
};

config.resolver = {
	...config.resolver,
	assetExts: config.resolver.assetExts.filter((ext) => ext !== "svg"),
	sourceExts: [...config.resolver.sourceExts, "svg"],
};

// Exclude Flow files to prevent parsing errors
config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== "flow");
config.resolver.blockList = [/.*\.flow$/];

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
	const resolvedModuleName = ALIASES[moduleName] ?? moduleName;
	return originalResolveRequest
		? originalResolveRequest(context, resolvedModuleName, platform)
		: context.resolveRequest(context, resolvedModuleName, platform);
};

// Wrap with NativeWind and Reanimated
module.exports = wrapWithReanimatedMetroConfig(withNativeWind(config, { input: "./global.css" }));
