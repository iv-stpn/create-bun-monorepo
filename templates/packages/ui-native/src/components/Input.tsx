import { StyleSheet, Text, TextInput, type TextInputProps, type TextStyle, View, type ViewStyle } from "react-native";

export type InputProps = Omit<TextInputProps, "style"> & {
	label?: string;
	placeholder?: string;
	value?: string;
	onChangeText?: (text: string) => void;
	error?: string;
	disabled?: boolean;
	variant?: "default" | "filled" | "outlined";
	size?: "small" | "medium" | "large";
	style?: ViewStyle;
	inputStyle?: TextStyle;
};

export function Input({
	label,
	placeholder,
	value,
	onChangeText,
	error,
	disabled = false,
	variant = "default",
	size = "medium",
	style,
	inputStyle,
	...props
}: InputProps) {
	const containerStyle = [styles.container, style];

	const inputContainerStyle = [
		styles.inputContainer,
		styles[`inputContainer_${variant}`],
		styles[`inputContainer_${size}`],
		error && styles.inputContainer_error,
		disabled && styles.inputContainer_disabled,
	];

	const textInputStyle = [styles.input, styles[`input_${size}`], disabled && styles.input_disabled, inputStyle];

	return (
		<View style={containerStyle}>
			{label && <Text style={styles.label}>{label}</Text>}
			<View style={inputContainerStyle}>
				<TextInput
					style={textInputStyle}
					placeholder={placeholder}
					value={value}
					onChangeText={onChangeText}
					editable={!disabled}
					placeholderTextColor="#8E8E93"
					{...props}
				/>
			</View>
			{error && <Text style={styles.error}>{error}</Text>}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	label: {
		fontSize: 16,
		fontWeight: "500",
		color: "#1C1C1E",
		marginBottom: 8,
	},
	inputContainer: {
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#E5E5E7",
		backgroundColor: "#ffffff",
	},
	inputContainer_default: {
		borderColor: "#E5E5E7",
	},
	inputContainer_filled: {
		backgroundColor: "#F2F2F7",
		borderColor: "transparent",
	},
	inputContainer_outlined: {
		borderColor: "#007AFF",
		borderWidth: 2,
	},
	inputContainer_small: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		minHeight: 36,
	},
	inputContainer_medium: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		minHeight: 44,
	},
	inputContainer_large: {
		paddingHorizontal: 20,
		paddingVertical: 16,
		minHeight: 52,
	},
	inputContainer_error: {
		borderColor: "#FF3B30",
	},
	inputContainer_disabled: {
		backgroundColor: "#F2F2F7",
		opacity: 0.6,
	},
	input: {
		fontSize: 16,
		color: "#1C1C1E",
		flex: 1,
	},
	input_small: {
		fontSize: 14,
	},
	input_medium: {
		fontSize: 16,
	},
	input_large: {
		fontSize: 18,
	},
	input_disabled: {
		color: "#8E8E93",
	},
	error: {
		fontSize: 14,
		color: "#FF3B30",
		marginTop: 4,
	},
});
