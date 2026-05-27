import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";

export default function PlaceholderScreen({ title }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
});
