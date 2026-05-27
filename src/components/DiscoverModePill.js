import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../theme/colors";

export default function DiscoverModePill({ onPress, style }) {
  return (
    <Pressable
      accessibilityLabel="Disable discover mode"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        style,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.text}>DISCOVER</Text>
      <Ionicons name="close" size={13} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: "row",
    gap: 2,
    minHeight: 28,
    paddingHorizontal: 12,
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  text: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.72,
  },
});
