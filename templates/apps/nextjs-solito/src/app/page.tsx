import { Link } from "solito/link";

export default function Home() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center p-24">
			<div className="text-center">
				<h1 className="text-6xl font-bold mb-8">Example app</h1>
				<p className="text-xl mb-8">Welcome to your Next.js app with Solito for universal navigation!</p>

				<div className="flex gap-4 justify-center">
					<Link href="/about" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
						About Page
					</Link>

					<Link href="/profile" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
						Profile Page
					</Link>
				</div>

				<p className="mt-8 text-gray-600">
					This template uses Solito for universal navigation between Next.js and React Native.
				</p>
			</div>
		</div>
	);
}
