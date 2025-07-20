import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, type TextStyle, TouchableOpacity, type ViewStyle } from "react-native";

export type ButtonProps = {
	onPress: () => void;
	variant?: "primary" | "secondary" | "outline";
	size?: "small" | "medium" | "large";
	disabled?: boolean;
	loading?: boolean;
	style?: ViewStyle;
	textStyle?: TextStyle;
} & ({ title: string; children?: never } | { title?: never; children: ReactNode });

export function Button({
	title,
	onPress,
	variant = "primary",
	size = "medium",
	disabled = false,
	loading = false,
	style,
	textStyle,
}: ButtonProps) {
	const buttonStyle = [
		styles.button,
		styles[`button_${variant}`],
		styles[`button_${size}`],
		disabled && styles.button_disabled,
		style,
	];

	const buttonTextStyle = [
		styles.text,
		styles[`text_${variant}`],
		styles[`text_${size}`],
		disabled && styles.text_disabled,
		textStyle,
	];

	return (
		<TouchableOpacity style={buttonStyle} onPress={onPress} disabled={disabled || loading} activeOpacity={0.8}>
			{loading ? (
				<ActivityIndicator size="small" color={variant === "primary" ? "#ffffff" : "#007AFF"} />
			) : (
				<Text style={buttonTextStyle}>{title}</Text>
			)}
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	button: {
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},
	button_primary: {
		backgroundColor: "#007AFF",
		borderColor: "#007AFF",
	},
	button_secondary: {
		backgroundColor: "#F2F2F7",
		borderColor: "#F2F2F7",
	},
	button_outline: {
		backgroundColor: "transparent",
		borderColor: "#007AFF",
	},
	button_small: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		minHeight: 32,
	},
	button_medium: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		minHeight: 44,
	},
	button_large: {
		paddingHorizontal: 20,
		paddingVertical: 16,
		minHeight: 52,
	},
	button_disabled: {
		opacity: 0.5,
	},
	text: {
		fontWeight: "600",
	},
	text_primary: {
		color: "#ffffff",
	},
	text_secondary: {
		color: "#1C1C1E",
	},
	text_outline: {
		color: "#007AFF",
	},
	text_small: {
		fontSize: 14,
	},
	text_medium: {
		fontSize: 16,
	},
	text_large: {
		fontSize: 18,
	},
	text_disabled: {
		opacity: 0.6,
	},
});
