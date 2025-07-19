import { z } from "zod";
import { emailSchema, passwordSchema } from "./common";

export const signUpSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: emailSchema,
	password: passwordSchema,
});

export const signInSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, "Password is required"),
});
