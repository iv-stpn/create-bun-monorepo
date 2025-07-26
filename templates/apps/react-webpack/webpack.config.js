const path = require("node:path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
	entry: "./src/index.tsx",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "bundle.js",
		clean: true,
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js"],
	},
	module: {
		rules: [
			{ test: /\.css$/, use: ["style-loader", "css-loader", "postcss-loader"] },
			{
				test: /\.(ts|tsx)$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
					options: {
						presets: [
							"@babel/preset-env",
							["@babel/preset-react", { runtime: "automatic" }],
							"@babel/preset-typescript",
						],
					},
				},
			},
		],
	},
	plugins: [new HtmlWebpackPlugin({ template: "./public/index.html" })],
	devServer: { port: 3001, open: true },
};
