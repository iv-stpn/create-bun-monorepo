interface TodoItem {
	text: string;
}

const todosDefault = [{ text: "Buy milk" }, { text: "Buy strawberries" }];

// We create an in-memory database.
// - We use globalThis so that the database isn't reset upon HMR.
// - The database is reset when restarting the server, use a proper database (SQLite/PostgreSQL/...) if you want persistent data.
const customGlobalThis = globalThis as unknown as { __database: { todos: TodoItem[] } };
if (!customGlobalThis.__database) customGlobalThis.__database = { todos: todosDefault };
const { todos } = customGlobalThis.__database;

export { todos };
export type { TodoItem };
