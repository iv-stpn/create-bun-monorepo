import type { PropsWithChildren } from "react";

import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Next.js Solito Example App",
	description: "Next.js app with Solito for universal navigation",
};

export default function RootLayout({ children }: PropsWithChildren) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
