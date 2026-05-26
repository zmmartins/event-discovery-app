import { Button, StyleSheet, Text, View } from "react-native";

export default function MapScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map Screen</Text>

      <Button title="Open List" onPress={() => navigation.navigate("List")} />
      <Button
        title="Open Profile"
        onPress={() => navigation.navigate("Profile")}
      />
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
