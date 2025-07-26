const path = require("node:path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
	entry: "./index.web.js",
	mode: "development",
	module: {
		rules: [
			{ test: /\.css$/, use: ["style-loader", "css-loader", "postcss-loader"] },
			{
				test: /\.(js|jsx|ts|tsx)$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
					options: {
						presets: ["@react-native/babel-preset"],
					},
				},
			},
		],
	},
	resolve: {
		alias: {
			"react-native$": "react-native-web",
		},
		extensions: [".web.js", ".js", ".web.ts", ".ts", ".web.tsx", ".tsx"],
		modules: [
			path.resolve(__dirname, "node_modules"), // Also look in local node_modules if they exist
			path.resolve(__dirname, "../../node_modules"), // Look for modules in monorepo root
		],
	},
	resolveLoader: {
		modules: [
			path.resolve(__dirname, "node_modules"),
			path.resolve(__dirname, "../../node_modules"), // Look for loaders in monorepo root
		],
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: "./public/index.html",
			inject: true,
		}),
	],
	devServer: {
		static: {
			directory: path.join(__dirname, "public"),
		},
		compress: true,
		port: 8080,
		hot: true,
		open: false,
	},
	output: {
		path: path.resolve(__dirname, "web-build"),
		filename: "bundle.js",
		clean: true,
	},
};
