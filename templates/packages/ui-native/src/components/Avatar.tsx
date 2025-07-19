import type React from "react";
import { Image, type ImageStyle, StyleSheet, Text, View, type ViewStyle } from "react-native";

export interface AvatarProps {
	source?: { uri: string } | number;
	size?: "small" | "medium" | "large" | "xlarge";
	fallbackText?: string;
	style?: ViewStyle;
	imageStyle?: ImageStyle;
}

export const Avatar: React.FC<AvatarProps> = ({ source, size = "medium", fallbackText, style, imageStyle }) => {
	const containerStyle = [styles.container, styles[`container_${size}`], style];

	const avatarImageStyle = [styles.image, styles[`image_${size}`], imageStyle];

	const fallbackStyle = [styles.fallback, styles[`fallback_${size}`]];

	const fallbackTextStyle = [styles.fallbackText, styles[`fallbackText_${size}`]];

	if (source) {
		return (
			<View style={containerStyle}>
				<Image source={source} style={avatarImageStyle} />
			</View>
		);
	}

	const initials = fallbackText
		? fallbackText
				.split(" ")
				.map((word) => word.charAt(0))
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "?";

	return (
		<View style={containerStyle}>
			<View style={fallbackStyle}>
				<Text style={fallbackTextStyle}>{initials}</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		borderRadius: 50,
		overflow: "hidden",
	},
	container_small: {
		width: 32,
		height: 32,
	},
	container_medium: {
		width: 48,
		height: 48,
	},
	container_large: {
		width: 64,
		height: 64,
	},
	container_xlarge: {
		width: 96,
		height: 96,
	},
	image: {
		borderRadius: 50,
	},
	image_small: {
		width: 32,
		height: 32,
	},
	image_medium: {
		width: 48,
		height: 48,
	},
	image_large: {
		width: 64,
		height: 64,
	},
	image_xlarge: {
		width: 96,
		height: 96,
	},
	fallback: {
		backgroundColor: "#007AFF",
		alignItems: "center",
		justifyContent: "center",
		width: "100%",
		height: "100%",
	},
	fallback_small: {
		borderRadius: 16,
	},
	fallback_medium: {
		borderRadius: 24,
	},
	fallback_large: {
		borderRadius: 32,
	},
	fallback_xlarge: {
		borderRadius: 48,
	},
	fallbackText: {
		color: "#ffffff",
		fontWeight: "600",
	},
	fallbackText_small: {
		fontSize: 12,
	},
	fallbackText_medium: {
		fontSize: 16,
	},
	fallbackText_large: {
		fontSize: 20,
	},
	fallbackText_xlarge: {
		fontSize: 28,
	},
});
