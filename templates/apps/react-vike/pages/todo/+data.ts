// https://vike.dev/data

import type { PageContextServer } from "vike/types";
import { todos } from "../../database/todoItems";

export type Data = {
	todo: { text: string }[];
};

export default function data(_pageContext: PageContextServer): Data {
	return { todo: todos };
}
