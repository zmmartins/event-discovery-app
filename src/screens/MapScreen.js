import { useRouter } from "expo-router";
import { Button, StyleSheet, Text, View } from "react-native";

export default function MapScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map Screen</Text>

      <Button title="Open List" onPress={() => router.push("/list")} />
      <Button title="Open Profile" onPress={() => router.push("/profile")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
});
