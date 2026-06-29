import { BlurView } from "expo-blur";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

function getBackdropOpacity(progress) {
  "worklet";

  return interpolate(progress, [0, 1], [0, 1], Extrapolation.CLAMP);
}

export default function MorphingPreviewBackdrop({
  onPress,
  onTouchMove,
  progressValue,
}) {
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: getBackdropOpacity(progressValue.value),
  }));

  return (
    <Pressable
      accessibilityLabel="Close event preview"
      accessibilityRole="button"
      onPress={onPress}
      onTouchMove={onTouchMove}
      style={styles.container}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, backdropStyle]}
      >
        <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.dimOverlay} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
});
