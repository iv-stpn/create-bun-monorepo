import { useState } from "react";
import "./App.css";

function App() {
	const [count, setCount] = useState(0);

	return (
		<div className="App">
			<header className="App-header">
				<h1>Example app</h1>
				<h2>Welcome to your React Webpack app!</h2>
				<div className="card">
					<button type="button" onClick={() => setCount((count) => count + 1)}>
						count is {count}
					</button>
					<p>
						Edit <code>src/App.tsx</code> and save to reload.
					</p>
				</div>
			</header>
		</div>
	);
}

export default App;
