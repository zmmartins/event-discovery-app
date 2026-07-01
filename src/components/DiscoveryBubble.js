import { StyleSheet, View } from "react-native";

import { colors } from "../theme/colors";

export const DISCOVERY_BUBBLE_SIZE = 150;

export const discoveryBubbleStyles = StyleSheet.create({
  bubble: {
    backgroundColor: colors.accent.secondary,
    borderRadius: DISCOVERY_BUBBLE_SIZE / 2,
    boxShadow: [
      {
        blurRadius: 18,
        color: "rgba(0, 0, 0, 0.24)",
        offsetX: 0,
        offsetY: 8,
      },
      {
        blurRadius: 24,
        color: "rgba(255, 255, 255, 0.58)",
        inset: true,
        offsetX: 12,
        offsetY: 14,
      },
    ],
    elevation: 1,
    height: DISCOVERY_BUBBLE_SIZE,
    width: DISCOVERY_BUBBLE_SIZE,
    zIndex: 1,
  },
});

export default function DiscoveryBubble({ style }) {
  return <View style={[discoveryBubbleStyles.bubble, style]} />;
}
