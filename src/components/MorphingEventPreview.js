import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePathname } from "expo-router";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import {
  EVENT_PIN_AVATAR_POSITIONS,
  EVENT_PIN_METRICS,
  getEventPinLayout,
  getEventPinParticles,
} from "./EventPin";
import { toggleSavedEvent } from "../services/eventService";
import { LOG_ACTIONS, logInteraction } from "../services/interactionLogService";
import { colors } from "../theme/colors";
import { getAvatarImage, getEventImage } from "../utils/imageAssets";

const CARD_HEIGHT = 216;
const CARD_RADIUS = 14;
const CARD_PADDING = 10;
const THUMBNAIL_WIDTH = 119;
const THUMBNAIL_HEIGHT = 196;
const THUMBNAIL_RADIUS = 8;
const INFO_GAP = 12;
const DETAILS_BUTTON_WIDTH = 62;
const DETAILS_BUTTON_HEIGHT = 32;
const PIN_AVATAR_SIZE = 18;
const PIN_AVATAR_BORDER_WIDTH = 2;
const CARD_AVATAR_SIZE = 24;
const CARD_AVATAR_BORDER_WIDTH = 1.5;
const CARD_AVATAR_OVERLAP = 10;
const CARD_CONTENT_LEFT = CARD_PADDING + THUMBNAIL_WIDTH + INFO_GAP;
const CARD_AVATAR_TOP = CARD_HEIGHT - CARD_PADDING - CARD_AVATAR_SIZE - 6;
const CARD_AVATAR_STEP = CARD_AVATAR_SIZE - CARD_AVATAR_OVERLAP;
const PIN_SURFACE_COLOR = colors.primary;
const CARD_SURFACE_COLOR = colors.surface;
const CARD_BORDER_COLOR = colors.border;

function MorphingAvatar({ friend, hasOverflow, index, layout, progress }) {
  const avatarPosition =
    EVENT_PIN_AVATAR_POSITIONS[index] ?? EVENT_PIN_AVATAR_POSITIONS[0];
  const startLeft =
    layout.circleOffset +
    EVENT_PIN_METRICS.circleSize / 2 +
    avatarPosition.x -
    PIN_AVATAR_SIZE / 2;
  const startTop =
    layout.circleOffset +
    EVENT_PIN_METRICS.circleSize / 2 +
    avatarPosition.y -
    PIN_AVATAR_SIZE / 2;
  const endLeft = CARD_CONTENT_LEFT + index * CARD_AVATAR_STEP;
  const endTop = CARD_AVATAR_TOP;

  const avatarStyle = useAnimatedStyle(() => {
    const value = progress.value;
    const size = interpolate(
      value,
      [0, 1],
      [PIN_AVATAR_SIZE, CARD_AVATAR_SIZE]
    );
    const borderWidth = interpolate(
      value,
      [0, 1],
      [PIN_AVATAR_BORDER_WIDTH, CARD_AVATAR_BORDER_WIDTH]
    );

    return {
      borderRadius: size / 2,
      borderWidth,
      height: size,
      left: interpolate(value, [0, 1], [startLeft, endLeft]),
      opacity:
        hasOverflow && index === 3
          ? interpolate(value, [0, 0.72, 1], [1, 0.55, 0.12], Extrapolation.CLAMP)
          : 1,
      top: interpolate(value, [0, 1], [startTop, endTop]),
      width: size,
    };
  }, [endLeft, endTop, hasOverflow, index, startLeft, startTop]);

  const imageStyle = useAnimatedStyle(() => {
    const value = progress.value;
    const imageSize = interpolate(
      value,
      [0, 1],
      [
        PIN_AVATAR_SIZE - PIN_AVATAR_BORDER_WIDTH * 2,
        CARD_AVATAR_SIZE - CARD_AVATAR_BORDER_WIDTH * 2,
      ]
    );

    return {
      borderRadius: imageSize / 2,
      height: imageSize,
      width: imageSize,
    };
  });

  return (
    <Animated.View style={[styles.morphAvatar, avatarStyle]}>
      <Animated.Image
        accessibilityLabel={friend.name}
        source={getAvatarImage(friend.avatarKey)}
        style={imageStyle}
      />
    </Animated.View>
  );
}

function OverflowAvatar({ index, progress }) {
  const overflowStyle = useAnimatedStyle(() => {
    const value = progress.value;
    const opacity = interpolate(
      value,
      [0.58, 0.86, 1],
      [0, 0.5, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [
        {
          scale: interpolate(value, [0.58, 1], [0.76, 1], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.moreAvatar,
        {
          left: CARD_CONTENT_LEFT + index * CARD_AVATAR_STEP,
          top: CARD_AVATAR_TOP,
        },
        overflowStyle,
      ]}
    >
      <Text style={styles.moreAvatarText}>+</Text>
    </Animated.View>
  );
}

const MorphingEventPreview = forwardRef(function MorphingEventPreview(
  {
    event,
    geometry,
    isDiscoverMode = false,
    onCloseComplete,
    onOpen,
    onSavedChange,
    screen = "MapScreen",
    source = "map_preview",
  },
  ref
) {
  const pathname = usePathname();
  const progress = useSharedValue(0);
  const saveScale = useSharedValue(1);
  const closeReasonRef = useRef(null);
  const isClosingRef = useRef(false);
  const [isSaved, setIsSaved] = useState(Boolean(event.isSaved));

  const layout = getEventPinLayout(event);
  const particles = getEventPinParticles(event.id, layout, isDiscoverMode);
  const attendees = Array.isArray(event.attendingFriends)
    ? event.attendingFriends
    : [];
  const morphAvatars = attendees.slice(0, 4);
  const hasOverflow = attendees.length > 4;
  const price = event.price?.toUpperCase?.() ?? "";

  useEffect(() => {
    setIsSaved(Boolean(event.isSaved));
  }, [event.id, event.isSaved]);

  useEffect(() => {
    isClosingRef.current = false;
    progress.value = 0;
    progress.value = withSpring(1, {
      damping: 18,
      mass: 0.75,
      stiffness: 190,
    });
  }, [event.id, progress]);

  const finishClose = useCallback(() => {
    isClosingRef.current = false;
    onCloseComplete?.(closeReasonRef.current);
  }, [onCloseComplete]);

  const startClose = useCallback(
    (reason = "unknown") => {
      if (isClosingRef.current) return;

      isClosingRef.current = true;
      closeReasonRef.current = reason;
      progress.value = withTiming(
        0,
        {
          duration: 230,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(finishClose)();
          }
        }
      );
    },
    [finishClose, progress]
  );

  useImperativeHandle(
    ref,
    () => ({
      close: startClose,
    }),
    [startClose]
  );

  const containerStyle = useAnimatedStyle(() => {
    const value = progress.value;

    return {
      height: interpolate(value, [0, 1], [geometry.cloneHeight, geometry.height]),
      left: interpolate(value, [0, 1], [geometry.cloneLeft, geometry.left]),
      top: interpolate(value, [0, 1], [geometry.cloneTop, geometry.top]),
      width: interpolate(value, [0, 1], [geometry.cloneWidth, geometry.width]),
    };
  }, [geometry]);

  const surfaceStyle = useAnimatedStyle(() => {
    const value = progress.value;

    return {
      backgroundColor: interpolateColor(
        value,
        [0, 1],
        [PIN_SURFACE_COLOR, CARD_SURFACE_COLOR]
      ),
      borderColor: interpolateColor(
        value,
        [0, 1],
        [PIN_SURFACE_COLOR, CARD_BORDER_COLOR]
      ),
      borderRadius: interpolate(
        value,
        [0, 1],
        [EVENT_PIN_METRICS.circleSize / 2, CARD_RADIUS]
      ),
      height: interpolate(value, [0, 1], [EVENT_PIN_METRICS.circleSize, CARD_HEIGHT]),
      left: interpolate(value, [0, 1], [layout.circleOffset, 0]),
      top: interpolate(value, [0, 1], [layout.circleOffset, 0]),
      width: interpolate(value, [0, 1], [EVENT_PIN_METRICS.circleSize, geometry.width]),
    };
  }, [geometry.width, layout.circleOffset]);

  const particlesStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3], [1, 0], Extrapolation.CLAMP),
  }));

  const thumbnailStyle = useAnimatedStyle(() => {
    const value = progress.value;

    return {
      borderRadius: interpolate(
        value,
        [0, 1],
        [EVENT_PIN_METRICS.imageSize / 2, THUMBNAIL_RADIUS]
      ),
      height: interpolate(
        value,
        [0, 1],
        [EVENT_PIN_METRICS.imageSize, THUMBNAIL_HEIGHT]
      ),
      left: interpolate(
        value,
        [0, 1],
        [layout.circleOffset + 2, CARD_PADDING]
      ),
      top: interpolate(value, [0, 1], [layout.circleOffset + 2, CARD_PADDING]),
      width: interpolate(
        value,
        [0, 1],
        [EVENT_PIN_METRICS.imageSize, THUMBNAIL_WIDTH]
      ),
    };
  }, [layout.circleOffset]);

  const cardContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.42, 0.72, 1],
      [0, 0.45, 1],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        translateY: interpolate(progress.value, [0.42, 1], [8, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const tailStyle = useAnimatedStyle(() => {
    const value = progress.value;

    return {
      borderTopColor: interpolateColor(
        value,
        [0, 1],
        [PIN_SURFACE_COLOR, CARD_SURFACE_COLOR]
      ),
      left: interpolate(
        value,
        [0, 1],
        [layout.contentRadius - EVENT_PIN_METRICS.tailWidth / 2, geometry.tailLeft]
      ),
      top: interpolate(value, [0, 1], [layout.tailTop, geometry.tailTop]),
    };
  }, [geometry.tailLeft, geometry.tailTop, layout.contentRadius, layout.tailTop]);

  const saveIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));

  function animateSavePulse() {
    saveScale.value = 0.82;
    saveScale.value = withSpring(1, {
      damping: 8,
      mass: 0.45,
      stiffness: 320,
    });
  }

  async function handleSavePress() {
    const nextIsSaved = !isSaved;

    setIsSaved(nextIsSaved);
    animateSavePulse();
    Haptics.selectionAsync().catch(() => null);

    try {
      const updatedEvent = await toggleSavedEvent(event.id);
      setIsSaved(Boolean(updatedEvent?.isSaved));
      onSavedChange?.(updatedEvent);
      logInteraction(LOG_ACTIONS.eventBookmarkToggled, {
        eventId: event.id,
        isSaved: Boolean(updatedEvent?.isSaved),
        route: pathname,
        screen,
        source,
      }).catch(() => null);
    } catch {
      setIsSaved(!nextIsSaved);
    }
  }

  function handleOpenPress() {
    logInteraction(LOG_ACTIONS.eventCardPressed, {
      eventId: event.id,
      route: pathname,
      screen,
      source,
    }).catch(() => null);
    onOpen?.();
  }

  return (
    <Animated.View pointerEvents="box-none" style={[styles.container, containerStyle]}>
      <Animated.View
        onStartShouldSetResponder={() => true}
        style={[styles.surface, surfaceStyle]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.cloud,
          {
            height: layout.containerSize,
            width: layout.containerSize,
          },
          particlesStyle,
        ]}
      >
        {particles.map((particle) => (
          <View
            key={particle.id}
            style={[
              styles.particle,
              isDiscoverMode && styles.discoverParticle,
              {
                borderRadius: particle.size / 2,
                height: particle.size,
                left: layout.contentRadius + particle.x - particle.size / 2,
                opacity: particle.opacity,
                top: layout.contentRadius + particle.y - particle.size / 2,
                width: particle.size,
              },
            ]}
          />
        ))}
      </Animated.View>

      <Animated.Image
        accessibilityLabel={`${event.title} thumbnail`}
        resizeMode="cover"
        source={getEventImage(event.thumbnailKey)}
        style={[styles.thumbnail, thumbnailStyle]}
      />

      {morphAvatars.map((friend, index) => (
        <MorphingAvatar
          friend={friend}
          hasOverflow={hasOverflow}
          index={index}
          key={friend.id || `${friend.name}-${index}`}
          layout={layout}
          progress={progress}
        />
      ))}

      {hasOverflow && <OverflowAvatar index={3} progress={progress} />}

      <Animated.View pointerEvents="box-none" style={[styles.cardContent, cardContentStyle]}>
        <View style={styles.headerRow}>
          <Text numberOfLines={2} style={styles.title}>
            {event.title}
          </Text>

          <Pressable
            accessibilityLabel={isSaved ? "Remove saved event" : "Save event"}
            accessibilityRole="button"
            accessibilityState={{ selected: isSaved }}
            hitSlop={8}
            onPress={handleSavePress}
            style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
          >
            <Animated.View style={saveIconStyle}>
              <Ionicons
                name="bookmark"
                size={20}
                color={isSaved ? colors.primary : colors.iconMuted}
              />
            </Animated.View>
          </Pressable>
        </View>

        <Text numberOfLines={2} style={styles.address}>
          {event.locationName}
        </Text>
        <Text style={styles.price}>{price}</Text>

        <Pressable
          accessibilityLabel={`Open details for ${event.title}`}
          accessibilityRole="button"
          onPress={handleOpenPress}
          style={({ pressed }) => [styles.detailsButton, pressed && styles.pressed]}
        >
          <Text style={styles.detailsButtonText}>CHECK US</Text>
          <Text style={styles.detailsButtonText}>OUT</Text>
        </Pressable>
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.tail, tailStyle]} />
    </Animated.View>
  );
});

export default MorphingEventPreview;

const styles = StyleSheet.create({
  container: {
    overflow: "visible",
    position: "absolute",
    zIndex: 3,
  },
  surface: {
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    position: "absolute",
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    zIndex: 1,
  },
  cloud: {
    left: 0,
    position: "absolute",
    top: 0,
    zIndex: 0,
  },
  particle: {
    backgroundColor: colors.secondary,
    position: "absolute",
  },
  discoverParticle: {
    backgroundColor: colors.secondary,
  },
  thumbnail: {
    position: "absolute",
    zIndex: 3,
  },
  morphAvatar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.secondary,
    justifyContent: "center",
    overflow: "hidden",
    position: "absolute",
    zIndex: 6,
  },
  moreAvatar: {
    alignItems: "center",
    backgroundColor: colors.iconMuted,
    borderColor: colors.surface,
    borderRadius: CARD_AVATAR_SIZE / 2,
    borderWidth: CARD_AVATAR_BORDER_WIDTH,
    height: CARD_AVATAR_SIZE,
    justifyContent: "center",
    position: "absolute",
    width: CARD_AVATAR_SIZE,
    zIndex: 7,
  },
  moreAvatarText: {
    color: colors.surface,
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 20,
  },
  cardContent: {
    bottom: CARD_PADDING,
    left: CARD_CONTENT_LEFT,
    position: "absolute",
    right: CARD_PADDING,
    top: CARD_PADDING + 6,
    zIndex: 5,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 6,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 17,
  },
  saveButton: {
    alignItems: "center",
    borderRadius: 10,
    height: 28,
    justifyContent: "center",
    marginTop: -2,
    width: 24,
  },
  address: {
    color: colors.secondaryText,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 12,
  },
  price: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 6,
  },
  detailsButton: {
    alignItems: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 5,
    bottom: 0,
    height: DETAILS_BUTTON_HEIGHT,
    justifyContent: "center",
    minWidth: DETAILS_BUTTON_WIDTH,
    paddingHorizontal: 6,
    position: "absolute",
    right: 0,
  },
  detailsButtonText: {
    color: colors.iconActive,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 10,
  },
  tail: {
    borderLeftColor: "transparent",
    borderLeftWidth: EVENT_PIN_METRICS.tailWidth / 2,
    borderRightColor: "transparent",
    borderRightWidth: EVENT_PIN_METRICS.tailWidth / 2,
    borderTopWidth: EVENT_PIN_METRICS.tailHeight,
    height: 0,
    position: "absolute",
    width: 0,
    zIndex: 2,
  },
  pressed: {
    opacity: 0.72,
  },
});
