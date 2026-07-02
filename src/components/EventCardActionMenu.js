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
import EventCard from "./EventCard";
import { getEventPinActionLayout } from "./EventPinActionMenu";

const CARD_ACTION_BUTTON_SIZE = 64;
const HOVERED_ACTION_SCALE = 1.22;
const HOVERED_ACTION_EXTRA_DISTANCE = 18;
const HOVER_ANIMATION_MS = 110;
const ACTION_LABEL_SIDE_OFFSET = 32;
const ACTION_LABEL_VERTICAL_OFFSET = 34;
const ACTION_LABEL_BOTTOM_MIN_OFFSET = 96;
const ACTION_LABEL_VERTICAL_SWITCH_RATIO = 0.58;

function getLiquidGlassAvailable() {
  if (Platform.OS !== "ios") return false;

  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

const liquidGlassAvailable = getLiquidGlassAvailable();

function normalizeAvoidanceInsets(avoidanceInsets = {}) {
  return {
    bottom: Math.max(Number(avoidanceInsets.bottom) || 0, 0),
    left: Math.max(Number(avoidanceInsets.left) || 0, 0),
    right: Math.max(Number(avoidanceInsets.right) || 0, 0),
    top: Math.max(Number(avoidanceInsets.top) || 0, 0),
  };
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

export default function EventCardActionMenu({
  avoidanceInsets = {},
  cardFrame,
  columnWidth,
  event,
  hoveredAction,
  onOpen,
  onSavedChange,
  origin,
  screenHeight,
  screenWidth,
  visible = false,
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const hoverProgressByActionRef = useRef({});
  const safeScreenHeight = Math.max(Number(screenHeight) || 1, 1);
  const safeScreenWidth = Math.max(Number(screenWidth) || 1, 1);
  const safeAvoidanceInsets = normalizeAvoidanceInsets(avoidanceInsets);

  const layout = useMemo(
    () =>
      getEventPinActionLayout({
        avoidanceInsets,
        event,
        origin,
        otherPinPoints: [],
        screenHeight,
        screenWidth,
      }),
    [avoidanceInsets, event, origin, screenHeight, screenWidth]
  );

  useEffect(() => {
    layout.actions.forEach((action) => {
      if (!hoverProgressByActionRef.current[action.id]) {
        hoverProgressByActionRef.current[action.id] = new Animated.Value(0);
      }
    });
  }, [layout.actions]);

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
    layout.actions.forEach((action) => {
      const hoverProgress = hoverProgressByActionRef.current[action.id];

      if (!hoverProgress) return;

      Animated.timing(hoverProgress, {
        duration: HOVER_ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
        toValue: hoveredAction === action.id ? 1 : 0,
        useNativeDriver: true,
      }).start();
    });
  }, [hoveredAction, layout.actions]);

  if (!origin || !cardFrame || !event) return null;

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const focusedCardScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.055],
  });

  const focusedCardRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", origin.x > safeScreenWidth / 2 ? "-2.4deg" : "2.4deg"],
  });

  const focusedCardTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const hoveredActionConfig = layout.actions.find(
    (action) => action.id === hoveredAction
  );

  const labelIsOnLeft = origin.x > safeScreenWidth / 2;

  const usableTop = safeAvoidanceInsets.top;
  const usableBottom = safeScreenHeight - safeAvoidanceInsets.bottom;
  const usableHeight = Math.max(usableBottom - usableTop, 1);
  const verticalSwitchY =
    usableTop + usableHeight * ACTION_LABEL_VERTICAL_SWITCH_RATIO;

  const labelShouldUseTop = origin.y >= verticalSwitchY;

  const labelVerticalStyle = labelShouldUseTop
    ? {
        top: safeAvoidanceInsets.top + ACTION_LABEL_VERTICAL_OFFSET,
      }
    : {
        bottom:
          Math.max(safeAvoidanceInsets.bottom, ACTION_LABEL_BOTTOM_MIN_OFFSET) +
          ACTION_LABEL_VERTICAL_OFFSET,
      };

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
      >
        <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.backdropDim} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.focusedCard,
          {
            left: cardFrame.x,
            opacity: progress,
            top: cardFrame.y,
            transform: [
              { translateY: focusedCardTranslateY },
              { scale: focusedCardScale },
              { rotate: focusedCardRotate },
            ],
            width: cardFrame.width,
          },
        ]}
      >
        <EventCard
          columnWidth={columnWidth ?? cardFrame.width}
          event={event}
          onOpen={onOpen}
          onSavedChange={onSavedChange}
          screen="ListScreen"
          source="list_action_menu"
        />
      </Animated.View>

      {hoveredActionConfig && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.actionLabelContainer,
            {
              ...labelVerticalStyle,
              left: labelIsOnLeft ? ACTION_LABEL_SIDE_OFFSET : undefined,
              opacity: progress,
              right: labelIsOnLeft ? undefined : ACTION_LABEL_SIDE_OFFSET,
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

        const hoverTranslateX = hoverProgress
          ? hoverProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, outwardX],
            })
          : 0;

        const hoverTranslateY = hoverProgress
          ? hoverProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, outwardY],
            })
          : 0;

        const hoverScale = hoverProgress
          ? hoverProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [1, HOVERED_ACTION_SCALE],
            })
          : 1;

        return (
          <Animated.View
            accessibilityLabel={action.accessibilityLabel}
            accessibilityRole="button"
            key={action.id}
            style={[
              styles.actionPosition,
              {
                left: origin.x - CARD_ACTION_BUTTON_SIZE / 2,
                opacity: progress,
                top: origin.y - CARD_ACTION_BUTTON_SIZE / 2,
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
  focusedCard: {
    elevation: 18,
    position: "absolute",
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.2,
    shadowRadius: 22,
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
  },
  actionPosition: {
    elevation: 7,
    height: CARD_ACTION_BUTTON_SIZE,
    position: "absolute",
    width: CARD_ACTION_BUTTON_SIZE,
  },
  actionPositionActive: {
    elevation: 12,
  },
  actionCircle: {
    alignItems: "center",
    backgroundColor: colors.effects.surfaceOverlay,
    borderColor: colors.effects.surfaceBorder,
    borderRadius: CARD_ACTION_BUTTON_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 7,
    height: CARD_ACTION_BUTTON_SIZE,
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    width: CARD_ACTION_BUTTON_SIZE,
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
