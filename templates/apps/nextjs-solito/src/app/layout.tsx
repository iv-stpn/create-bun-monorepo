import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Next.js Solito Example App",
	description: "Next.js app with Solito for universal navigation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
