/**
 * Template configuration for the create-bun-monorepo
 */

interface TemplateInfo {
	name: string;
	description: string;
	path: string | null;
}

interface CategoryInfo {
	name: string;
	description: string;
	templates: Record<string, TemplateInfo>;
}

export interface TemplatesConfig {
	categories: Record<string, CategoryInfo>;
}

// Template categories and their templates
const TEMPLATES_CONFIG: TemplatesConfig = {
	categories: {
		blank: {
			name: "Blank Template",
			description: "Empty template with basic TypeScript setup",
			templates: {
				blank: {
					name: "Blank",
					description: "Basic TypeScript project with minimal setup",
					path: null,
				},
			},
		},
		frontend: {
			name: "Frontend Applications",
			description: "Web frontend applications and frameworks",
			templates: {
				"react-vite": {
					name: "React + Vite",
					description: "React application with Vite bundler and HMR",
					path: "apps/react-vite",
				},
				"react-webpack": {
					name: "React + Webpack",
					description: "React application with Webpack bundler",
					path: "apps/react-webpack",
				},
				"react-vike": {
					name: "React + Vike",
					description: "Full-stack React framework with Vike for SSR/SPA",
					path: "apps/react-vike",
				},
				nextjs: {
					name: "Next.js",
					description: "Full-stack React framework with SSR/SSG",
					path: "apps/nextjs",
				},
				"nextjs-solito": {
					name: "Next.js + Solito",
					description: "Next.js with Solito for universal React Native",
					path: "apps/nextjs-solito",
				},
				"react-router": {
					name: "React Router v7 (previously Remix)",
					description: "CSR + SSR React framework with nested routing",
					path: "apps/react-router",
				},
			},
		},
		mobile: {
			name: "Mobile Applications",
			description: "React Native and mobile development",
			templates: {
				"react-native-expo": {
					name: "React Native + Expo",
					description: "React Native with Expo for rapid development",
					path: "apps/react-native-expo",
				},
				"react-native-bare": {
					name: "React Native Bare",
					description: "Bare React Native setup without Expo",
					path: "apps/react-native-bare",
				},
			},
		},
		backend: {
			name: "Backend Services",
			description: "API servers and backend services",
			templates: {
				express: {
					name: "Express.js",
					description: "Fast, unopinionated web framework for Node.js",
					path: "apps/express",
				},
				hono: {
					name: "Hono",
					description: "Ultrafast web framework for Cloudflare Workers, Deno, and Bun",
					path: "apps/hono",
				},
				nestjs: {
					name: "NestJS",
					description: "Progressive Node.js framework for scalable server-side applications",
					path: "apps/nestjs",
				},
			},
		},
		packages: {
			name: "Shared Packages",
			description: "Reusable libraries and utilities",
			templates: {
				utils: {
					name: "Utilities",
					description: "Common utility functions for objects, arrays, strings, and dates",
					path: "packages/utils",
				},
				ui: {
					name: "UI Components",
					description: "Reusable UI components with Tailwind CSS and Radix UI",
					path: "packages/ui",
				},
				schemas: {
					name: "Schemas",
					description: "Zod schemas that can be used for backend data validation and frontend forms",
					path: "packages/schemas",
				},
				hooks: {
					name: "React Hooks",
					description: "Custom React hooks reusable across React and React Native apps",
					path: "packages/hooks",
				},
				"ui-native": {
					name: "UI Native Components",
					description: "Reusable React Native components for mobil apps & web apps with a RN/Expo adapter.",
					path: "packages/ui-native",
				},
				db: {
					name: "Database",
					description: "Database client and schemas with ORM support",
					path: "packages/db",
				},
			},
		},
	},
} as const;

// Full-stack frameworks that can use ORMs (even though they're in frontend category)
const FULLSTACK_FRAMEWORKS = ["nextjs", "nextjs-solito", "react-router", "react-vike"];
const BACKEND_FRAMEWORKS = ["express", "hono", "nestjs"];
const MOBILE_FRAMEWORKS = ["react-native-expo", "react-native-bare"];

export const ORM_FRAMEWORKS = [...FULLSTACK_FRAMEWORKS, ...BACKEND_FRAMEWORKS];
export const NATIVE_FRAMEWORKS = [...MOBILE_FRAMEWORKS, "nextjs-solito"];
export const REACT_FRAMEWORKS = [...MOBILE_FRAMEWORKS, ...FULLSTACK_FRAMEWORKS, "react-vite", "react-webpack"];

// Helper function to get template config (replaces loadTemplateConfig)
export function getTemplateConfig(): TemplatesConfig {
	return TEMPLATES_CONFIG;
}
