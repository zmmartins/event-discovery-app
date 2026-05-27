import { usePathname, useRouter } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { useDiscoveryMode } from "../context/DiscoveryModeContext";
import useInteractionLogger from "../hooks/useInteractionLogger";
import useShakeToDiscover from "../hooks/useShakeToDiscover";
import { LOG_ACTIONS } from "../services/interactionLogService";
import { colors } from "../theme/colors";

const BUBBLE_SIZE = 150;
const PARTICLE_COUNT = 92;

function createParticles(width, height) {
  const spreadRadius = Math.max(width, height) * 0.78;

  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const angle = (Math.PI * 2 * index) / PARTICLE_COUNT + (index % 7) * 0.19;
    const ringWave = Math.sin(index * 1.91);
    const baseRadius = 96 + ringWave * 28 + (index % 3) * 8;
    const finalRadius = spreadRadius * (0.52 + ((index * 37) % 45) / 100);
    const size = 5 + ((index * 13) % 12);

    return {
      angle,
      baseX: Math.cos(angle) * baseRadius,
      baseY: Math.sin(angle) * baseRadius,
      finalX: Math.cos(angle) * finalRadius,
      finalY: Math.sin(angle) * finalRadius,
      id: `particle-${index}`,
      opacity: 0.3 + ((index * 17) % 60) / 100,
      size,
    };
  });
}

export default function ShakeDiscoverScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const { activateDiscoveryMode } = useDiscoveryMode();
  const cloudProgress = useRef(new Animated.Value(0)).current;
  const particles = useMemo(() => createParticles(width, height), [height, width]);

  useInteractionLogger(LOG_ACTIONS.shakeDiscoverOpened, {
    screen: "ShakeDiscoverScreen",
  });

  const animateParticleExpansion = useCallback(() => {
    cloudProgress.setValue(0);
    Animated.timing(cloudProgress, {
      duration: 1700,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [cloudProgress]);

  const completeDiscovery = useCallback(async () => {
    await activateDiscoveryMode({
      route: pathname,
      screen: "ShakeDiscoverScreen",
      source: "shake",
    });
    router.replace("/map/list");
  }, [activateDiscoveryMode, pathname, router]);

  const { isShaking } = useShakeToDiscover({
    onShakeComplete: completeDiscovery,
    onShakeStart: animateParticleExpansion,
  });

  const bubbleScale = cloudProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.16],
  });
  const cloudOpacity = cloudProgress.interpolate({
    inputRange: [0, 0.85, 1],
    outputRange: [1, 1, 0.82],
  });

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.visualStage}>
        <Animated.View
          style={[
            styles.particleStage,
            {
              left: width / 2,
              opacity: cloudOpacity,
            },
          ]}
        >
          {particles.map((particle) => {
            const translateX = cloudProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [particle.baseX, particle.finalX],
            });
            const translateY = cloudProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [particle.baseY, particle.finalY],
            });

            return (
              <Animated.View
                key={particle.id}
                style={[
                  styles.particle,
                  {
                    borderRadius: particle.size / 2,
                    height: particle.size,
                    opacity: particle.opacity,
                    width: particle.size,
                    transform: [{ translateX }, { translateY }],
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        <Animated.View
          style={[
            styles.bubble,
            {
              transform: [{ scale: bubbleScale }],
            },
          ]}
        >
          <View style={styles.bubbleGlow} />
          <View style={styles.bubbleCore} />
        </Animated.View>
      </View>

      <View style={styles.copyBlock}>
        <Text style={styles.shakeText}>SHAKE</Text>
        <Text style={styles.shakeText}>YOUR</Text>
        <Text style={styles.shakeText}>PHONE</Text>
        {isShaking && <Text style={styles.processingText}>DISCOVERING</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    flex: 1,
    overflow: "hidden",
    paddingBottom: 120,
  },
  visualStage: {
    alignItems: "center",
    height: "54%",
    justifyContent: "center",
  },
  particleStage: {
    height: 1,
    position: "absolute",
    top: "48%",
    width: 1,
  },
  particle: {
    backgroundColor: colors.discover,
    position: "absolute",
  },
  bubble: {
    alignItems: "center",
    backgroundColor: colors.secondary,
    borderRadius: BUBBLE_SIZE / 2,
    height: BUBBLE_SIZE,
    justifyContent: "center",
    shadowColor: colors.surface,
    shadowOffset: {
      width: -12,
      height: -14,
    },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    width: BUBBLE_SIZE,
  },
  bubbleGlow: {
    backgroundColor: colors.effects.surfaceGlow,
    borderRadius: 54,
    height: 108,
    left: 18,
    position: "absolute",
    top: 14,
    width: 108,
  },
  bubbleCore: {
    backgroundColor: colors.discover,
    borderRadius: 52,
    height: 104,
    opacity: 0.78,
    width: 104,
  },
  copyBlock: {
    paddingHorizontal: 24,
  },
  shakeText: {
    color: colors.text,
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 62,
  },
  processingText: {
    color: colors.effects.textSubtle,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 8,
  },
});
