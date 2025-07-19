const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const config = getDefaultConfig(__dirname);

// Exclude Flow files to prevent parsing errors
config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== "flow");
config.resolver.blockList = [/.*\.flow$/];

config.resolver.nodeModulesPaths = [
	path.resolve(__dirname, "node_modules"),
	path.resolve(__dirname, "../../node_modules"), // Look for modules in monorepo root
];

module.exports = config;
