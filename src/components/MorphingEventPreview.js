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
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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

import { toggleSavedEvent } from "../services/eventService";
import { LOG_ACTIONS, logInteraction } from "../services/interactionLogService";
import { colors } from "../theme/colors";
import { getAvatarImage, getEventImage } from "../utils/imageAssets";
import { getSessionEventPinLayout } from "./EventPin";

const DEFAULT_CARD_HEIGHT = 300;
const CARD_RADIUS = 0;
const CARD_PADDING = 12;

const IMAGE_HEIGHT = 150;

const PRICE_BADGE_HEIGHT = 28;
const CTA_HEIGHT = 38;
const SIDE_COLUMN_WIDTH = 94;
const SIDE_COLUMN_RIGHT_INSET = 14;

const CARD_AVATAR_SIZE = 26;
const CARD_AVATAR_BORDER_WIDTH = 1.5;
const CARD_AVATAR_OVERLAP = 10;

const PIN_SURFACE_COLOR = colors.primary;
const CARD_SURFACE_COLOR = colors.primary;
const CARD_BORDER_COLOR = colors.primary;

const ACTION_BACKGROUND_COLOR = colors.text;
const ACTION_TEXT_COLOR = colors.surface;

function PreviewAttendeeStack({ attendees }) {
  const safeAttendees = Array.isArray(attendees) ? attendees : [];
  const hasOverflow = safeAttendees.length > 4;
  const visibleAttendees = hasOverflow
    ? safeAttendees.slice(0, 3)
    : safeAttendees.slice(0, 4);

  if (safeAttendees.length === 0) {
    return <View style={styles.emptyStack} />;
  }

  return (
    <View style={styles.avatarStack}>
      {visibleAttendees.map((friend, index) => (
        <Image
          accessibilityLabel={friend.name}
          key={friend.id || `${friend.name}-${index}`}
          source={getAvatarImage(friend.avatarKey)}
          style={[styles.avatar, index > 0 && styles.avatarOverlap]}
        />
      ))}

      {hasOverflow && (
        <View style={[styles.avatar, styles.avatarOverlap, styles.moreAvatar]}>
          <Text style={styles.moreAvatarText}>+</Text>
        </View>
      )}
    </View>
  );
}

const MorphingEventPreview = forwardRef(function MorphingEventPreview(
  {
    event,
    geometry,
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

  const layout = getSessionEventPinLayout(event);
  const attendees = Array.isArray(event.attendingFriends) ? event.attendingFriends : [];
  const finalCardHeight = geometry.cardHeight ?? DEFAULT_CARD_HEIGHT;
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
      borderRadius: interpolate(value, [0, 1], [layout.outerSize / 2, CARD_RADIUS]),
      height: interpolate(value, [0, 1], [layout.outerSize, finalCardHeight]),
      left: interpolate(value, [0, 1], [0, 0]),
      top: interpolate(value, [0, 1], [0, 0]),
      width: interpolate(value, [0, 1], [layout.outerSize, geometry.width]),
    };
  }, [finalCardHeight, geometry.width, layout.outerSize]);

  const thumbnailClipStyle = useAnimatedStyle(() => {
    const value = progress.value;

    return {
      borderBottomLeftRadius: interpolate(value, [0, 1], [layout.circleSize / 2, 0]),
      borderBottomRightRadius: interpolate(value, [0, 1], [layout.circleSize / 2, 0]),
      borderTopLeftRadius: interpolate(
        value,
        [0, 1],
        [layout.circleSize / 2, CARD_RADIUS]
      ),
      borderTopRightRadius: interpolate(
        value,
        [0, 1],
        [layout.circleSize / 2, CARD_RADIUS]
      ),
      height: interpolate(value, [0, 1], [layout.circleSize, IMAGE_HEIGHT]),
      left: interpolate(value, [0, 1], [layout.circleOffset, 0]),
      overflow: "hidden",
      top: interpolate(value, [0, 1], [layout.circleOffset, 0]),
      width: interpolate(value, [0, 1], [layout.circleSize, geometry.width]),
    };
  }, [geometry.width, layout.circleOffset, layout.circleSize]);

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

  const saveIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));

  const saveButtonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.45, 0.75, 1],
      [0, 0.6, 1],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        scale: interpolate(progress.value, [0.45, 1], [0.92, 1], Extrapolation.CLAMP),
      },
    ],
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

      <Animated.View style={[styles.thumbnailClip, thumbnailClipStyle]}>
        <Animated.Image
          accessibilityLabel={`${event.title} thumbnail`}
          resizeMode="cover"
          source={getEventImage(event.thumbnailKey)}
          style={styles.thumbnail}
        />
      </Animated.View>

      <Animated.View style={[styles.saveButtonOverlay, saveButtonStyle]}>
        <Pressable
          accessibilityLabel={isSaved ? "Remove saved event" : "Save event"}
          accessibilityRole="button"
          accessibilityState={{ selected: isSaved }}
          hitSlop={10}
          onPress={handleSavePress}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        >
          <Animated.View style={saveIconStyle}>
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={30}
              color={colors.surface}
            />
          </Animated.View>
        </Pressable>
      </Animated.View>

      <Animated.View
        pointerEvents="box-none"
        style={[styles.cardContent, cardContentStyle]}
      >
        <View style={styles.contentInfo}>
          <View style={styles.titleRow}>
            <Text numberOfLines={2} style={styles.title}>
              {event.title}
            </Text>

            <View style={styles.sideColumn}>
              <View style={styles.priceBadge}>
                <Text style={styles.priceBadgeText}>{price}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.metaColumn}>
              <Text numberOfLines={2} style={styles.address}>
                {event.locationName}
              </Text>

              <Text style={styles.dateText}>{event.dateLabel ?? "APR 24, 2026"}</Text>
            </View>

            <View style={styles.sideColumn}>
              <PreviewAttendeeStack attendees={attendees} />
            </View>
          </View>
        </View>

        <View style={styles.ctaRow}>
          <Pressable
            accessibilityLabel={`Open details for ${event.title}`}
            accessibilityRole="button"
            onPress={handleOpenPress}
            style={({ pressed }) => [styles.detailsButton, pressed && styles.pressed]}
          >
            <Text style={styles.detailsButtonText}>CHECK US OUT</Text>
          </Pressable>
        </View>
      </Animated.View>
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
  thumbnailClip: {
    position: "absolute",
    zIndex: 3,
  },
  thumbnail: {
    height: "100%",
    width: "100%",
  },
  saveButtonOverlay: {
    position: "absolute",
    right: CARD_PADDING + 10,
    top: CARD_PADDING + 10,
    zIndex: 7,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 34,
    justifyContent: "center",
    padding: 0,
    width: 34,
  },
  pressed: {
    opacity: 0.72,
  },

  cardContent: {
    bottom: CARD_PADDING,
    left: CARD_PADDING,
    position: "absolute",
    right: CARD_PADDING,
    top: IMAGE_HEIGHT + 18,
    zIndex: 5,
  },
  contentInfo: {
    paddingBottom: CTA_HEIGHT + 18,
  },

  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },

  title: {
    color: colors.text,
    flex: 1,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 24,
    minWidth: 0,
  },

  priceBadge: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: ACTION_BACKGROUND_COLOR,
    borderRadius: 7,
    height: PRICE_BADGE_HEIGHT,
    justifyContent: "center",
    minWidth: 58,
    paddingHorizontal: 10,
  },

  priceBadgeText: {
    color: ACTION_TEXT_COLOR,
    fontSize: 12,
    fontWeight: "900",
  },

  address: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },

  dateText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },

  infoRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  metaColumn: {
    flex: 1,
    minWidth: 0,
  },

  sideColumn: {
    alignItems: "flex-end",
    marginRight: SIDE_COLUMN_RIGHT_INSET,
    width: SIDE_COLUMN_WIDTH,
  },

  ctaRow: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },

  detailsButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: ACTION_BACKGROUND_COLOR,
    borderRadius: 10,
    height: CTA_HEIGHT,
    justifyContent: "center",
  },

  detailsButtonText: {
    color: ACTION_TEXT_COLOR,
    fontSize: 13,
    fontWeight: "900",
  },

  avatarStack: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    minHeight: CARD_AVATAR_SIZE,
  },
  emptyStack: {
    minHeight: CARD_AVATAR_SIZE,
    width: CARD_AVATAR_SIZE,
  },
  avatar: {
    borderColor: colors.surface,
    borderRadius: CARD_AVATAR_SIZE / 2,
    borderWidth: CARD_AVATAR_BORDER_WIDTH,
    height: CARD_AVATAR_SIZE,
    width: CARD_AVATAR_SIZE,
  },
  avatarOverlap: {
    marginLeft: -CARD_AVATAR_OVERLAP,
  },
  moreAvatar: {
    alignItems: "center",
    backgroundColor: ACTION_BACKGROUND_COLOR,
    justifyContent: "center",
  },
  moreAvatarText: {
    color: ACTION_TEXT_COLOR,
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 20,
  },
});
