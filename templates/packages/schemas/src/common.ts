import { z } from "zod";

const MAXIMUM_PASSWORD_LENGTH = 128;
const MINIMUM_PASSWORD_LENGTH = 8;

const lowercaseRegex = /[a-z]/;
const uppercaseRegex = /[A-Z]/;
const numberRegex = /[0-9]/;
const specialCharacterRegex = /[^a-zA-Z0-9]/;

export const passwordSchema = z
	.string()
	.min(MINIMUM_PASSWORD_LENGTH, "Password too short")
	.max(MAXIMUM_PASSWORD_LENGTH, "Password too long")
	.refine((password) => {
		if (!lowercaseRegex.test(password)) return { message: "Password should contain at least one lowercase letter" };
		if (!uppercaseRegex.test(password)) return { message: "Password should contain at least one uppercase letter" };
		if (!numberRegex.test(password)) return { message: "Password should contain at least one number" };
		if (!specialCharacterRegex.test(password))
			return { message: "Password should contain at least one special character" };
		return true;
	});

export const emailSchema = z.email({ message: "Email format invalid" });
