/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	devIndicators: {
		buildActivity: false,
	},
	experimental: {
		port: 3002,
	},
};

module.exports = nextConfig;
