import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

export type CardProps = {
	children: ReactNode;
	variant?: "default" | "elevated" | "outlined";
	padding?: "none" | "small" | "medium" | "large";
	style?: ViewStyle;
};

export const Card: React.FC<CardProps> = ({ children, variant = "default", padding = "medium", style }) => {
	const cardStyle = [styles.card, styles[`card_${variant}`], styles[`card_${padding}`], style];

	return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
	card: {
		borderRadius: 12,
		backgroundColor: "#ffffff",
	},
	card_default: {
		backgroundColor: "#F9F9F9",
	},
	card_elevated: {
		backgroundColor: "#ffffff",
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	card_outlined: {
		backgroundColor: "#ffffff",
		borderWidth: 1,
		borderColor: "#E5E5E7",
	},
	card_none: {
		padding: 0,
	},
	card_small: {
		padding: 8,
	},
	card_medium: {
		padding: 16,
	},
	card_large: {
		padding: 24,
	},
});
