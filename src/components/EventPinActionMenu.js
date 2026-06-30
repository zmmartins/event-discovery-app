import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import {
  LIQUID_GLASS_COLOR_SCHEME,
  LIQUID_GLASS_EFFECT_STYLE,
  LIQUID_GLASS_TINT_COLOR,
} from "../theme/liquidGlass";
import EventPin, { getSessionEventPinLayout } from "./EventPin";

const PIN_ACTION_BUTTON_SIZE = 64;
const PIN_ACTION_RADIUS = 108;
const PIN_ACTION_HIT_RADIUS = 46;

const EDGE_PADDING = 12;
const NEARBY_PIN_CLEARANCE = PIN_ACTION_BUTTON_SIZE + 18;
const FAN_ANGLE_OFFSET = 38;
const HOVERED_ACTION_SCALE = 1.22;
const HOVERED_ACTION_EXTRA_DISTANCE = 18;
const HOVER_ANIMATION_MS = 110;
const CANDIDATE_BASE_ANGLES = [270, 225, 315, 180, 0, 135, 45, 90];
const UPWARD_PREFERRED_ANGLE = 270;
const UPWARD_BASE_BONUS = 220;
const UPWARD_CENTER_BONUS = 40;
const DOWNWARD_CENTER_PENALTY = 180;

const PIN_ACTIONS = [
  {
    id: "expand",
    accessibilityLabel: "Expand event",
    icon: "expand-outline",
    label: "Expandir",
  },
  {
    id: "share",
    accessibilityLabel: "Share event",
    icon: "share-outline",
    label: "Partilhar",
  },
  {
    id: "save",
    accessibilityLabel: "Save event",
    icon: "bookmark-outline",
    label: "Guardar",
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

function getAngleDistance(firstAngle, secondAngle) {
  return Math.abs(((firstAngle - secondAngle + 540) % 360) - 180);
}

function getPointFromAngle(origin, degrees, radius) {
  const radians = toRadians(degrees);

  return {
    x: origin.x + Math.cos(radians) * radius,
    y: origin.y + Math.sin(radians) * radius,
  };
}

function normalizeAvoidanceInsets(avoidanceInsets = {}) {
  return {
    bottom: Math.max(Number(avoidanceInsets.bottom) || 0, 0),
    left: Math.max(Number(avoidanceInsets.left) || 0, 0),
    right: Math.max(Number(avoidanceInsets.right) || 0, 0),
    top: Math.max(Number(avoidanceInsets.top) || 0, 0),
  };
}

function getAvailableAreaDistance(
  point,
  { avoidanceInsets, screenHeight, screenWidth }
) {
  const safeInsets = normalizeAvoidanceInsets(avoidanceInsets);
  const minDistance = PIN_ACTION_BUTTON_SIZE / 2 + EDGE_PADDING;

  const minX = safeInsets.left + minDistance;
  const minY = safeInsets.top + minDistance;
  const maxX = screenWidth - safeInsets.right - minDistance;
  const maxY = screenHeight - safeInsets.bottom - minDistance;

  return Math.min(
    point.x - minX,
    point.y - minY,
    maxX - point.x,
    maxY - point.y
  );
}

function getCandidateScore(
  centers,
  {
    avoidanceInsets,
    baseAngle,
    origin,
    otherPinPoints,
    screenHeight,
    screenWidth,
  }
) {
  let score = centers.reduce((currentScore, center) => {
    const availableAreaDistance = getAvailableAreaDistance(center, {
      avoidanceInsets,
      screenHeight,
      screenWidth,
    });
    let nextScore = currentScore + availableAreaDistance;

    if (availableAreaDistance < 0) {
      nextScore += availableAreaDistance * 1200;
    }

    otherPinPoints.forEach((pinPoint) => {
      const distance = getDistance(center, pinPoint);

      if (distance < NEARBY_PIN_CLEARANCE) {
        nextScore -= (NEARBY_PIN_CLEARANCE - distance) * 8;
      }
    });

    return nextScore;
  }, 0);

  const angleDistanceFromUp = getAngleDistance(baseAngle, UPWARD_PREFERRED_ANGLE);
  score += Math.max(0, UPWARD_BASE_BONUS - angleDistanceFromUp * 2);

  centers.forEach((center) => {
    const verticalDelta = center.y - origin.y;

    if (verticalDelta < 0) {
      score += UPWARD_CENTER_BONUS;
    } else {
      score -= DOWNWARD_CENTER_PENALTY;
    }
  });

  return score;
}

export function getEventPinActionLayout({
  avoidanceInsets = {},
  origin,
  otherPinPoints = [],
  screenHeight,
  screenWidth,
} = {}) {
  const safeOrigin = origin ?? { x: 0, y: 0 };
  const safeScreenHeight = Math.max(screenHeight ?? 1, 1);
  const safeScreenWidth = Math.max(screenWidth ?? 1, 1);
  const safeAvoidanceInsets = normalizeAvoidanceInsets(avoidanceInsets);
  const safeOtherPinPoints = Array.isArray(otherPinPoints) ? otherPinPoints : [];

  const bestCandidate = CANDIDATE_BASE_ANGLES.map((baseAngle) => {
    const centers = [-FAN_ANGLE_OFFSET, 0, FAN_ANGLE_OFFSET].map((offset) =>
      getPointFromAngle(safeOrigin, baseAngle + offset, PIN_ACTION_RADIUS)
    );

    return {
      baseAngle,
      centers,
      score: getCandidateScore(centers, {
        avoidanceInsets: safeAvoidanceInsets,
        baseAngle,
        origin: safeOrigin,
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
  avoidanceInsets = {},
  event,
  hoveredAction,
  origin,
  otherPinPoints = [],
  screenHeight,
  screenWidth,
  visible = false,
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const hoverProgressByActionRef = useRef(
    PIN_ACTIONS.reduce((values, action) => {
      values[action.id] = new Animated.Value(0);
      return values;
    }, {})
  );
  const pinLayout = useMemo(() => getSessionEventPinLayout(event), [event]);
  const layout = useMemo(
    () =>
      getEventPinActionLayout({
        avoidanceInsets,
        origin,
        otherPinPoints,
        screenHeight,
        screenWidth,
      }),
    [avoidanceInsets, origin, otherPinPoints, screenHeight, screenWidth]
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

  useEffect(() => {
    PIN_ACTIONS.forEach((action) => {
      Animated.timing(hoverProgressByActionRef.current[action.id], {
        duration: HOVER_ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
        toValue: hoveredAction === action.id ? 1 : 0,
        useNativeDriver: true,
      }).start();
    });
  }, [hoveredAction]);

  if (!origin) return null;

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const focusedPinScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.22],
  });
  const hoveredActionConfig = layout.actions.find(
    (action) => action.id === hoveredAction
  );
  const labelIsOnLeft = origin.x > (screenWidth || 0) / 2;
  const labelBottom = Math.max(Number(avoidanceInsets?.bottom) || 0, 96) + 34;

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
      >
        <BlurView intensity={16} tint="light" style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.backdropDim} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.focusedPin,
          {
            height: pinLayout.outerSize,
            left: origin.x - pinLayout.outerSize / 2,
            opacity: progress,
            top: origin.y - pinLayout.outerSize / 2,
            transform: [{ scale: focusedPinScale }],
            width: pinLayout.outerSize,
          },
        ]}
      >
        <EventPin event={event} />
      </Animated.View>

      {hoveredActionConfig && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.actionLabelContainer,
            {
              bottom: labelBottom,
              left: labelIsOnLeft ? 32 : undefined,
              opacity: progress,
              right: labelIsOnLeft ? undefined : 32,
            },
          ]}
        >
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={styles.actionLabelText}
          >
            {hoveredActionConfig.label}
          </Text>
        </Animated.View>
      )}

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
        const deltaX = action.center.x - origin.x;
        const deltaY = action.center.y - origin.y;
        const distance = Math.max(Math.hypot(deltaX, deltaY), 1);
        const outwardX = (deltaX / distance) * HOVERED_ACTION_EXTRA_DISTANCE;
        const outwardY = (deltaY / distance) * HOVERED_ACTION_EXTRA_DISTANCE;
        const hoverProgress = hoverProgressByActionRef.current[action.id];
        const hoverTranslateX = hoverProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, outwardX],
        });
        const hoverTranslateY = hoverProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, outwardY],
        });
        const hoverScale = hoverProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, HOVERED_ACTION_SCALE],
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
                transform: [
                  { translateX: Animated.add(translateX, hoverTranslateX) },
                  { translateY: Animated.add(translateY, hoverTranslateY) },
                  { scale: Animated.multiply(scale, hoverScale) },
                ],
                zIndex: isActive ? 20 : index + 3,
              },
              isActive && styles.actionPositionActive,
            ]}
          >
            <ActionSurface active={isActive}>
              <Ionicons
                name={iconName}
                size={28}
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
    zIndex: 8,
  },
  backdrop: {
    zIndex: 0,
  },
  backdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  focusedPin: {
    position: "absolute",
    zIndex: 2,
  },
  actionLabelContainer: {
    maxWidth: "72%",
    position: "absolute",
    zIndex: 12,
  },
  actionLabelText: {
    color: colors.text,
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: 0,
    textShadowColor: "rgba(0, 0, 0, 0.22)",
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 8,
  },
  actionPosition: {
    elevation: 7,
    height: PIN_ACTION_BUTTON_SIZE,
    position: "absolute",
    width: PIN_ACTION_BUTTON_SIZE,
  },
  actionPositionActive: {
    elevation: 12,
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
    elevation: 12,
    shadowOpacity: 0.22,
    shadowRadius: 20,
  },
  fallbackTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.effects.surfaceOverlay,
  },
});
