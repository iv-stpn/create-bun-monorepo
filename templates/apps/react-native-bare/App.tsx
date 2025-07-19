import { useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";

// Define colors locally instead of importing from NewAppScreen
const Colors = {
	lighter: "#F3F3F3",
	light: "#DAE1E7",
	dark: "#444",
	darker: "#222",
	black: "#000",
	white: "#FFF",
};

function App(): JSX.Element {
	const isDarkMode = useColorScheme() === "dark";
	const [count, setCount] = useState(0);

	const backgroundStyle = {
		backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
	};

	return (
		<SafeAreaView style={[styles.container, backgroundStyle]}>
			<StatusBar
				barStyle={isDarkMode ? "light-content" : "dark-content"}
				backgroundColor={backgroundStyle.backgroundColor}
			/>
			<View style={styles.content}>
				<Text style={[styles.title, { color: isDarkMode ? Colors.white : Colors.black }]}>Example app</Text>
				<Text style={[styles.subtitle, { color: isDarkMode ? Colors.light : Colors.dark }]}>
					Welcome to your React Native app!
				</Text>

				<View style={styles.counterContainer}>
					<TouchableOpacity style={styles.button} onPress={() => setCount(count + 1)}>
						<Text style={styles.buttonText}>Count: {count}</Text>
					</TouchableOpacity>
				</View>

				<Text style={[styles.instructions, { color: isDarkMode ? Colors.light : Colors.dark }]}>
					Edit App.tsx to start working on your app!
				</Text>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
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
		textAlign: "center",
		marginTop: 30,
	},
});

export default App;
