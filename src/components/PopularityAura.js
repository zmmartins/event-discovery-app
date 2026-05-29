import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors } from "../theme/colors";

const INNER_RING_SIZE = 62;
const RING_STAGGER_MS = 180;
const AURA_COLOR = colors.secondary;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getPopularityAuraConfig(popularity) {
  const normalized = clamp(Number(popularity) || 0, 0, 100) / 100;

  return {
    auraSize: 66 + normalized * 34,
    baseOpacity: 0.22 + normalized * 0.24,
    duration: 2200 - normalized * 900,
    normalized,
    pulseScale: 1.015 + normalized * 0.085,
    ringCount: normalized > 0.72 ? 3 : normalized > 0.34 ? 2 : 1,
    strokeWidth: 1.4 + normalized * 3.2,
  };
}

function getRingLayout(config, index) {
  const ringProgress =
    config.ringCount === 1 ? 0 : index / (config.ringCount - 1);
  const ringSize =
    config.ringCount === 1
      ? config.auraSize
      : INNER_RING_SIZE + (config.auraSize - INNER_RING_SIZE) * ringProgress;
  const offset = (config.auraSize - ringSize) / 2;
  const borderWidth = config.strokeWidth * (1 - ringProgress * 0.2);
  const opacity = config.baseOpacity * (1 - ringProgress * 0.28);

  return {
    opacity,
    ringProgress,
    style: {
      borderRadius: ringSize / 2,
      borderWidth,
      height: ringSize,
      left: offset,
      opacity,
      top: offset,
      width: ringSize,
    },
  };
}

function AnimatedAuraRing({
  delay,
  duration,
  pulseScale,
  ringOpacity,
  ringProgress,
  ringStyle,
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = 0;
    pulse.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration,
          easing: Easing.inOut(Easing.cubic),
        }),
        -1,
        true
      )
    );

    return () => {
      pulse.value = 0;
    };
  }, [delay, duration, pulse]);

  const animatedRingStyle = useAnimatedStyle(() => {
    const scaleTarget = pulseScale + ringProgress * 0.018;

    return {
      opacity: ringOpacity * (1 - pulse.value * 0.45),
      transform: [
        {
          scale: 1 + (scaleTarget - 1) * pulse.value,
        },
      ],
    };
  }, [pulseScale, ringOpacity, ringProgress]);

  return <Animated.View style={[styles.ring, ringStyle, animatedRingStyle]} />;
}

export default function PopularityAura({
  animated = false,
  popularity = 0,
  style,
}) {
  const config = getPopularityAuraConfig(popularity);
  const rings = Array.from({ length: config.ringCount }, (_, index) => {
    return getRingLayout(config, index);
  });

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          height: config.auraSize,
          width: config.auraSize,
        },
        style,
      ]}
    >
      {rings.map((ring, index) => {
        if (animated) {
          return (
            <AnimatedAuraRing
              delay={index * RING_STAGGER_MS}
              duration={config.duration}
              key={`ring-${index}`}
              pulseScale={config.pulseScale}
              ringOpacity={ring.opacity}
              ringProgress={ring.ringProgress}
              ringStyle={ring.style}
            />
          );
        }

        return <View key={`ring-${index}`} style={[styles.ring, ring.style]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
  },
  ring: {
    borderColor: AURA_COLOR,
    position: "absolute",
  },
});
