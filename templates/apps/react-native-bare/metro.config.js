const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

const config = {
	resolver: {
		// Exclude Flow files to prevent parsing errors
		sourceExts: defaultConfig.resolver.sourceExts.filter((ext) => ext !== "flow"),
		blockList: [/.*\.flow$/],
	},
};

module.exports = mergeConfig(defaultConfig, config);
