import { useState } from "react";

export function TodoList({ initialTodoItems }: { initialTodoItems: { text: string }[] }) {
	const [todoItems, setTodoItems] = useState(initialTodoItems);
	const [newTodo, setNewTodo] = useState("");
	return (
		<>
			<ul>
				{todoItems.map((todoItem) => (
					<li key={todoItem.text}>{todoItem.text}</li>
				))}
			</ul>
			<div>
				<form
					onSubmit={(event) => {
						event.preventDefault();

						// Optimistic UI update
						setTodoItems((previous) => [...previous, { text: newTodo }]);
					}}
				>
					<input
						type="text"
						onChange={(event) => setNewTodo(event.target.value)}
						value={newTodo}
						className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto p-2 mr-1 mb-1"
					/>
					<button
						type="submit"
						className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-2 focus:outline-hidden focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto p-2"
					>
						Add to-do
					</button>
				</form>
			</div>
		</>
	);
}
