import * as Haptics from "expo-haptics";
import { usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, Vibration, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DiscoveryBubble, {
  DISCOVERY_BUBBLE_SIZE,
  discoveryBubbleStyles,
} from "../components/DiscoveryBubble";
import { useDiscoveryMode } from "../context/DiscoveryModeContext";
import useInteractionLogger from "../hooks/useInteractionLogger";
import useShakeToDiscover from "../hooks/useShakeToDiscover";
import { LOG_ACTIONS } from "../services/interactionLogService";
import { colors } from "../theme/colors";

const DISCOVERY_CIRCLE_SIZE = DISCOVERY_BUBBLE_SIZE;
const PARTICLE_FIELD_SIZE = 440;
const PARTICLE_COUNT = 58;
const PARTICLE_ORBIT_DURATION_MS = 26000;
const PARTICLE_PULSE_REPEATS = 4;
const VISUAL_STAGE_HEIGHT_RATIO = 0.54;
const BUBBLE_EXPAND_DURATION_MS = 950;
const POST_EXPAND_PAUSE_MS = 180;
const CONFIRMATION_TAP_GAP_MS = 95;
const POST_CONFIRMATION_NAVIGATION_DELAY_MS = 140;
const BUBBLE_COLLAPSE_DURATION_MS = 360;
const SHAKE_EXIT_DURATION_MS = 520;
const SHAKE_COPY_EXIT_DISTANCE = 260;

function createDiscoveryParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const ring = index % 4;
    const angle =
      (Math.PI * 2 * index) / PARTICLE_COUNT + ring * 0.17 + (index % 7) * 0.035;

    const radius = DISCOVERY_CIRCLE_SIZE / 2 + 14 + ring * 20 + ((index * 17) % 14);

    const size = 8 + ((index * 7) % 9);
    const opacity = 0.36 + ((index * 11) % 70) / 100;

    return {
      angle,
      id: `discovery-particle-${index}`,
      opacity,
      radius,
      size,
    };
  });
}

const DISCOVERY_PARTICLES = createDiscoveryParticles();

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function playConfirmationTapTap() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => null);
  await wait(CONFIRMATION_TAP_GAP_MS);
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => null);
}

function FloatingParticle({ particle, progress }) {
  const particleStyle = useAnimatedStyle(() => {
    const orbitAngle = particle.angle + progress.value * Math.PI * 2;
    const pulse =
      0.5 + 0.5 * Math.sin(progress.value * Math.PI * 2 * PARTICLE_PULSE_REPEATS);
    const radius = particle.radius + pulse * 6;
    const translateX = Math.cos(orbitAngle) * radius;
    const translateY = Math.sin(orbitAngle) * radius;
    const scale = 0.82 + pulse * 0.38;
    const opacity = particle.opacity;

    return {
      opacity,
      transform: [{ translateX }, { translateY }, { scale }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          borderRadius: particle.size / 2,
          height: particle.size,
          left: PARTICLE_FIELD_SIZE / 2,
          marginLeft: -particle.size / 2,
          marginTop: -particle.size / 2,
          top: PARTICLE_FIELD_SIZE / 2,
          width: particle.size,
        },
        particleStyle,
      ]}
    />
  );
}

export default function ShakeDiscoverScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { activateDiscoveryMode } = useDiscoveryMode();
  const particleProgress = useSharedValue(0);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const bubbleScale = useSharedValue(1);
  const screenExitProgress = useSharedValue(0);
  const bubbleTranslateY = useSharedValue(0);
  const copyTranslateX = useSharedValue(0);
  const copyOpacity = useSharedValue(1);
  const particleOpacity = useSharedValue(1);
  const hasStartedShakeSequenceRef = useRef(false);
  const isMountedRef = useRef(true);
  const [bubbleCenter, setBubbleCenter] = useState(null);
  const [shakeFeedbackLocked, setShakeFeedbackLocked] = useState(false);

  const bubbleBorderReachScale = useMemo(() => {
    if (!bubbleCenter) {
      return 1;
    }

    const bubbleRadius = DISCOVERY_CIRCLE_SIZE / 2;

    const nearestScreenBorderDistance = Math.min(
      bubbleCenter.x,
      screenWidth - bubbleCenter.x,
      bubbleCenter.y,
      screenHeight - bubbleCenter.y
    );

    return Math.max(1, nearestScreenBorderDistance / bubbleRadius);
  }, [bubbleCenter, screenHeight, screenWidth]);

  useInteractionLogger(LOG_ACTIONS.shakeDiscoverOpened, {
    screen: "ShakeDiscoverScreen",
  });

  useEffect(() => {
    particleProgress.value = 0;
    particleProgress.value = withRepeat(
      withTiming(1, {
        duration: PARTICLE_ORBIT_DURATION_MS,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    return () => {
      cancelAnimation(particleProgress);
    };
  }, [particleProgress]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cancelAnimation(bubbleScale);
      cancelAnimation(bubbleTranslateY);
      cancelAnimation(copyOpacity);
      cancelAnimation(copyTranslateX);
      cancelAnimation(particleOpacity);
      cancelAnimation(screenExitProgress);
      Vibration.cancel();
    };
  }, [
    bubbleScale,
    bubbleTranslateY,
    copyOpacity,
    copyTranslateX,
    particleOpacity,
    screenExitProgress,
  ]);

  const completeDiscovery = useCallback(async () => {
    await activateDiscoveryMode({
      route: pathname,
      screen: "ShakeDiscoverScreen",
      source: "shake",
      transitionType: "shake-to-list",
    });
    router.replace("/map/list");
  }, [activateDiscoveryMode, pathname, router]);

  const handleVisualStageLayout = useCallback((event) => {
    const { height, width, x, y } = event.nativeEvent.layout;

    setBubbleCenter({
      x: x + width / 2,
      y: y + height / 2,
    });
  }, []);

  const runScreenExitTransition = useCallback(() => {
    const targetBubbleTranslateY = bubbleCenter
      ? -bubbleCenter.y
      : -screenHeight * 0.45;

    screenExitProgress.value = withTiming(1, {
      duration: SHAKE_EXIT_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
    });

    particleOpacity.value = withTiming(0, {
      duration: SHAKE_EXIT_DURATION_MS * 0.65,
      easing: Easing.out(Easing.cubic),
    });

    copyTranslateX.value = withTiming(-SHAKE_COPY_EXIT_DISTANCE, {
      duration: SHAKE_EXIT_DURATION_MS,
      easing: Easing.in(Easing.cubic),
    });

    copyOpacity.value = withTiming(0, {
      duration: SHAKE_EXIT_DURATION_MS * 0.85,
      easing: Easing.out(Easing.cubic),
    });

    bubbleTranslateY.value = withTiming(
      targetBubbleTranslateY,
      {
        duration: SHAKE_EXIT_DURATION_MS,
        easing: Easing.inOut(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(completeDiscovery)();
        }
      }
    );
  }, [
    bubbleCenter,
    bubbleTranslateY,
    completeDiscovery,
    copyOpacity,
    copyTranslateX,
    particleOpacity,
    screenExitProgress,
    screenHeight,
  ]);

  const finishShakeSequence = useCallback(async () => {
    Vibration.cancel();
    setShakeFeedbackLocked(true);

    await wait(POST_EXPAND_PAUSE_MS);

    if (!isMountedRef.current) {
      return;
    }

    bubbleScale.value = withTiming(1, {
      duration: BUBBLE_COLLAPSE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });

    await playConfirmationTapTap();

    await wait(POST_CONFIRMATION_NAVIGATION_DELAY_MS);

    if (!isMountedRef.current) {
      return;
    }

    runScreenExitTransition();
  }, [bubbleScale, runScreenExitTransition]);

  const startShakeSequence = useCallback(() => {
    if (hasStartedShakeSequenceRef.current || !bubbleCenter) {
      return;
    }

    hasStartedShakeSequenceRef.current = true;

    bubbleScale.value = withTiming(
      bubbleBorderReachScale,
      {
        duration: BUBBLE_EXPAND_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(finishShakeSequence)();
        }
      }
    );
  }, [bubbleBorderReachScale, bubbleCenter, bubbleScale, finishShakeSequence]);

  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bubbleTranslateY.value }, { scale: bubbleScale.value }],
  }));

  const copyAnimatedStyle = useAnimatedStyle(() => ({
    opacity: copyOpacity.value,
    transform: [{ translateX: copyTranslateX.value }],
  }));

  const particleLayerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: particleOpacity.value,
  }));

  const { isShaking } = useShakeToDiscover({
    confirmationFeedbackEnabled: false,
    disabled: shakeFeedbackLocked,
    onShakeComplete: startShakeSequence,
    onShakeStart: startShakeSequence,
  });

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 84,
        },
      ]}
    >
      {bubbleCenter && (
        <View pointerEvents="none" style={styles.expandingBubbleLayer}>
          <Animated.View
            style={[
              discoveryBubbleStyles.bubble,
              styles.expandingDiscoveryCircle,
              {
                left: bubbleCenter.x,
                top: bubbleCenter.y,
              },
              bubbleAnimatedStyle,
            ]}
          />
        </View>
      )}

      <View
        pointerEvents="none"
        style={styles.visualStage}
        onLayout={handleVisualStageLayout}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.particleLayer, particleLayerAnimatedStyle]}
        >
          {DISCOVERY_PARTICLES.map((particle) => (
            <FloatingParticle
              key={particle.id}
              particle={particle}
              progress={particleProgress}
            />
          ))}
        </Animated.View>
        {!bubbleCenter && <DiscoveryBubble />}
      </View>

      <Animated.View style={[styles.copyBlock, copyAnimatedStyle]}>
        <Text style={styles.shakeText}>SHAKE</Text>
        <Text style={styles.shakeText}>YOUR</Text>
        <Text style={styles.shakeText}>PHONE</Text>
        {isShaking && <Text style={styles.processingText}>DISCOVERING</Text>}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    flex: 1,
    overflow: "visible",
    paddingBottom: 120,
  },
  expandingBubbleLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "visible",
    pointerEvents: "none",
    zIndex: 2,
  },
  expandingDiscoveryCircle: {
    marginLeft: -DISCOVERY_CIRCLE_SIZE / 2,
    marginTop: -DISCOVERY_CIRCLE_SIZE / 2,
    position: "absolute",
  },
  visualStage: {
    alignItems: "center",
    height: `${VISUAL_STAGE_HEIGHT_RATIO * 100}%`,
    justifyContent: "center",
    overflow: "visible",
  },
  particleLayer: {
    height: PARTICLE_FIELD_SIZE,
    left: "50%",
    marginLeft: -PARTICLE_FIELD_SIZE / 2,
    marginTop: -PARTICLE_FIELD_SIZE / 2,
    overflow: "visible",
    position: "absolute",
    top: "50%",
    width: PARTICLE_FIELD_SIZE,
    zIndex: 0,
  },
  particle: {
    backgroundColor: colors.accent.secondary,
    position: "absolute",
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
