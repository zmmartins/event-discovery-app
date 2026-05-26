import { StyleSheet, Text, View } from "react-native";

export default function ListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Event List</Text>
      <Text>A lista de eventos será implementada aqui.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
});
