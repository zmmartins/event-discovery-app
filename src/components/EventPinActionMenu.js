import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";

import { colors } from "../theme/colors";
import {
  LIQUID_GLASS_COLOR_SCHEME,
  LIQUID_GLASS_EFFECT_STYLE,
  LIQUID_GLASS_TINT_COLOR,
} from "../theme/liquidGlass";

const PIN_ACTION_BUTTON_SIZE = 54;
const PIN_ACTION_RADIUS = 84;
const PIN_ACTION_HIT_RADIUS = 34;

const EDGE_PADDING = 12;
const NEARBY_PIN_CLEARANCE = PIN_ACTION_BUTTON_SIZE + 18;
const FAN_ANGLE_OFFSET = 32;
const CANDIDATE_BASE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

const PIN_ACTIONS = [
  {
    id: "expand",
    accessibilityLabel: "Expand event",
    icon: "expand-outline",
  },
  {
    id: "share",
    accessibilityLabel: "Share event",
    icon: "share-outline",
  },
  {
    id: "save",
    accessibilityLabel: "Save event",
    icon: "bookmark-outline",
    savedIcon: "bookmark",
  },
];

function getLiquidGlassAvailable() {
  if (Platform.OS !== "ios") return false;

  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

const liquidGlassAvailable = getLiquidGlassAvailable();

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function getDistance(firstPoint, secondPoint) {
  if (!firstPoint || !secondPoint) return Number.POSITIVE_INFINITY;

  return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
}

function getPointFromAngle(origin, degrees, radius) {
  const radians = toRadians(degrees);

  return {
    x: origin.x + Math.cos(radians) * radius,
    y: origin.y + Math.sin(radians) * radius,
  };
}

function getBorderDistance(point, screenWidth, screenHeight) {
  const minDistance = PIN_ACTION_BUTTON_SIZE / 2 + EDGE_PADDING;

  return Math.min(
    point.x - minDistance,
    point.y - minDistance,
    screenWidth - minDistance - point.x,
    screenHeight - minDistance - point.y
  );
}

function getCandidateScore(centers, { otherPinPoints, screenHeight, screenWidth }) {
  return centers.reduce((score, center) => {
    const borderDistance = getBorderDistance(center, screenWidth, screenHeight);
    let nextScore = score + borderDistance;

    if (borderDistance < 0) {
      nextScore += borderDistance * 1000;
    }

    otherPinPoints.forEach((pinPoint) => {
      const distance = getDistance(center, pinPoint);

      if (distance < NEARBY_PIN_CLEARANCE) {
        nextScore -= (NEARBY_PIN_CLEARANCE - distance) * 8;
      }
    });

    return nextScore;
  }, 0);
}

export function getEventPinActionLayout({
  origin,
  otherPinPoints = [],
  screenHeight,
  screenWidth,
} = {}) {
  const safeOrigin = origin ?? { x: 0, y: 0 };
  const safeScreenHeight = Math.max(screenHeight ?? 1, 1);
  const safeScreenWidth = Math.max(screenWidth ?? 1, 1);
  const safeOtherPinPoints = Array.isArray(otherPinPoints) ? otherPinPoints : [];

  const bestCandidate = CANDIDATE_BASE_ANGLES.map((baseAngle) => {
    const centers = [-FAN_ANGLE_OFFSET, 0, FAN_ANGLE_OFFSET].map((offset) =>
      getPointFromAngle(safeOrigin, baseAngle + offset, PIN_ACTION_RADIUS)
    );

    return {
      baseAngle,
      centers,
      score: getCandidateScore(centers, {
        otherPinPoints: safeOtherPinPoints,
        screenHeight: safeScreenHeight,
        screenWidth: safeScreenWidth,
      }),
    };
  }).sort((firstCandidate, secondCandidate) => {
    if (secondCandidate.score !== firstCandidate.score) {
      return secondCandidate.score - firstCandidate.score;
    }

    return firstCandidate.baseAngle - secondCandidate.baseAngle;
  })[0];

  const actions = PIN_ACTIONS.map((action, index) => ({
    ...action,
    center: bestCandidate.centers[index],
  }));

  return {
    actions,
    baseAngle: bestCandidate.baseAngle,
  };
}

export function getHoveredPinAction(point, layout) {
  if (!point || !layout?.actions?.length) return null;

  const hoveredAction = layout.actions
    .map((action) => ({
      action,
      distance: getDistance(point, action.center),
    }))
    .filter(({ distance }) => distance <= PIN_ACTION_HIT_RADIUS)
    .sort((firstAction, secondAction) => firstAction.distance - secondAction.distance)[0];

  return hoveredAction?.action.id ?? null;
}

function ActionSurface({ active, children }) {
  const surfaceStyle = [
    styles.actionCircle,
    active && styles.actionCircleActive,
  ];

  if (active) {
    return <View style={surfaceStyle}>{children}</View>;
  }

  if (Platform.OS === "ios" && liquidGlassAvailable) {
    return (
      <GlassView
        colorScheme={LIQUID_GLASS_COLOR_SCHEME}
        glassEffectStyle={LIQUID_GLASS_EFFECT_STYLE}
        isInteractive={false}
        style={surfaceStyle}
        tintColor={LIQUID_GLASS_TINT_COLOR}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView intensity={28} style={surfaceStyle} tint="light">
      <View pointerEvents="none" style={styles.fallbackTint} />
      {children}
    </BlurView>
  );
}

export default function EventPinActionMenu({
  event,
  hoveredAction,
  origin,
  otherPinPoints = [],
  screenHeight,
  screenWidth,
  visible = false,
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const layout = useMemo(
    () =>
      getEventPinActionLayout({
        origin,
        otherPinPoints,
        screenHeight,
        screenWidth,
      }),
    [origin, otherPinPoints, screenHeight, screenWidth]
  );

  useEffect(() => {
    Animated.spring(progress, {
      damping: visible ? 15 : 18,
      mass: 0.75,
      stiffness: visible ? 220 : 260,
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [progress, visible]);

  if (!origin) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      {layout.actions.map((action, index) => {
        const isActive = hoveredAction === action.id;
        const iconName =
          action.id === "save" && event?.isSaved
            ? action.savedIcon
            : action.icon;
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, action.center.x - origin.x],
        });
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, action.center.y - origin.y],
        });
        const scale = progress.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [0.56, 1.08, 1],
        });

        return (
          <Animated.View
            accessibilityLabel={action.accessibilityLabel}
            accessibilityRole="button"
            key={action.id}
            style={[
              styles.actionPosition,
              {
                left: origin.x - PIN_ACTION_BUTTON_SIZE / 2,
                opacity: progress,
                top: origin.y - PIN_ACTION_BUTTON_SIZE / 2,
                transform: [{ translateX }, { translateY }, { scale }],
                zIndex: index + 1,
              },
            ]}
          >
            <ActionSurface active={isActive}>
              <Ionicons
                name={iconName}
                size={24}
                color={isActive ? colors.text : colors.iconMuted}
              />
            </ActionSurface>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  actionPosition: {
    height: PIN_ACTION_BUTTON_SIZE,
    position: "absolute",
    width: PIN_ACTION_BUTTON_SIZE,
  },
  actionCircle: {
    alignItems: "center",
    backgroundColor: colors.effects.surfaceOverlay,
    borderColor: colors.effects.surfaceBorder,
    borderRadius: PIN_ACTION_BUTTON_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 7,
    height: PIN_ACTION_BUTTON_SIZE,
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    width: PIN_ACTION_BUTTON_SIZE,
  },
  actionCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  fallbackTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.effects.surfaceOverlay,
  },
});
