import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Event Discovery App</Text>
      <Text style={styles.subtitle}>Functional prototype</Text>

      <Link href="/map" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Open Map</Text>
        </Pressable>
      </Link>

      <Link href="/list" asChild>
        <Pressable style={styles.buttonSecondary}>
          <Text style={styles.buttonSecondaryText}>Open Event List</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
  },
  button: {
    backgroundColor: "#39F57A",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 12,
  },
  buttonText: {
    color: "#111",
    fontWeight: "700",
  },
  buttonSecondary: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  buttonSecondaryText: {
    color: "#111",
    fontWeight: "700",
  },
});
