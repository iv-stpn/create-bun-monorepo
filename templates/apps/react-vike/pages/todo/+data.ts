// https://vike.dev/data

import { todos } from "../../database/todoItems";

export type Data = {
	todo: { text: string }[];
};

export default function data(): Data {
	return { todo: todos };
}
