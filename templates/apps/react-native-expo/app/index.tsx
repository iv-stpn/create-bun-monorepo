import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HomeScreen() {
	const [count, setCount] = useState(0);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Example app</Text>
			<Text style={styles.subtitle}>Welcome to your Expo app!</Text>

			<View style={styles.counterContainer}>
				<TouchableOpacity style={styles.button} onPress={() => setCount(count + 1)}>
					<Text style={styles.buttonText}>Count: {count}</Text>
				</TouchableOpacity>
			</View>

			<Text style={styles.instructions}>Edit app/index.tsx to start working on your app!</Text>

			<StatusBar style="auto" />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		alignItems: "center",
		justifyContent: "center",
		padding: 20,
	},
	title: {
		fontSize: 32,
		fontWeight: "bold",
		marginBottom: 10,
	},
	subtitle: {
		fontSize: 18,
		color: "#666",
		marginBottom: 30,
	},
	counterContainer: {
		marginVertical: 20,
	},
	button: {
		backgroundColor: "#007AFF",
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8,
	},
	buttonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "bold",
	},
	instructions: {
		fontSize: 14,
		color: "#666",
		textAlign: "center",
		marginTop: 30,
	},
});
