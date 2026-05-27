import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/colors";

const statusBarStyles = {
  image: "light",
  lightBackground: "dark",
};

export default function ScreenStatusBar({
  variant = "lightBackground",
  withImageOverlay = false,
}) {
  const insets = useSafeAreaInsets();
  const style = statusBarStyles[variant] ?? statusBarStyles.lightBackground;
  const overlayHeight = insets.top;

  return (
    <>
      <StatusBar style={style} translucent />
      {withImageOverlay && (
        <View
          pointerEvents="none"
          style={[styles.overlay, { height: overlayHeight }]}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.effects.imageOverlay,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
});
