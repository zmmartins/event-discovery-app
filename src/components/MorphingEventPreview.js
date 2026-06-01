import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
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

import { LOG_ACTIONS, logInteraction } from "../services/interactionLogService";
import { colors } from "../theme/colors";
import { getAvatarImage, getEventImage } from "../utils/imageAssets";
import { getSessionEventPinLayout } from "./EventPin";

const DEFAULT_CARD_HEIGHT = 520;
const CARD_RADIUS = 4;

const DEFAULT_IMAGE_SIZE = 272;

const POSTER_PADDING = 14;
const POSTER_TOP_PADDING = 16;
const POSTER_HEADER_HEIGHT = 150;
const POSTER_IMAGE_GAP = 14;
const POSTER_BOTTOM_GAP = 14;
const POSTER_META_HEIGHT = 58;
const POSTER_BOTTOM_PADDING = 16;

const POSTER_TITLE_FONT_SIZE = 31;
const POSTER_TITLE_LINE_HEIGHT = 31;

const ACTION_BUTTON_SIZE = 48;
const ACTION_ICON_SIZE = 34;

const CARD_AVATAR_SIZE = 24;
const CARD_AVATAR_BORDER_WIDTH = 1.5;
const CARD_AVATAR_OVERLAP = 9;

const PIN_SURFACE_COLOR = colors.primary;
const CARD_SURFACE_COLOR = colors.primary;
const CARD_BORDER_COLOR = colors.primary;
const IMAGE_BORDER_WIDTH = StyleSheet.hairlineWidth;
const IMAGE_BORDER_COLOR = colors.primary;

const ACTION_BACKGROUND_COLOR = colors.text;
const ACTION_TEXT_COLOR = colors.surface;

const POSTER_MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function formatPosterTime(value) {
  const rawTime = String(value ?? "").trim();
  if (!rawTime) return "";

  const [rawHour, rawMinute] = rawTime.split(":");
  const hourNumber = Number(rawHour);

  if (!Number.isFinite(hourNumber)) {
    return rawTime.toUpperCase();
  }

  const hourLabel = String(hourNumber).padStart(2, "0");
  const minuteLabel =
    rawMinute && rawMinute !== "00" ? String(rawMinute).padStart(2, "0") : "";

  return `${hourLabel}H${minuteLabel}`;
}

function getPosterDateParts(event) {
  const rawDate = String(event?.date ?? "").trim();
  const [year, month, day] = rawDate.split("-");
  const timeLabel = formatPosterTime(event?.time);

  if (!year || !month || !day) {
    return {
      main: event?.dateLabel ? String(event.dateLabel).toUpperCase() : "DATE TBA",
      sub: timeLabel,
    };
  }

  const monthLabel = POSTER_MONTH_LABELS[Number(month) - 1] ?? month.toUpperCase();
  const dayLabel = String(day).padStart(2, "0");

  return {
    main: `${monthLabel} ${dayLabel}`,
    sub: [year, timeLabel].filter(Boolean).join(" | "),
  };
}

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
    screen = "MapScreen",
    source = "map_preview",
  },
  ref
) {
  const pathname = usePathname();
  const progress = useSharedValue(0);
  const closeReasonRef = useRef(null);
  const isClosingRef = useRef(false);

  const layout = getSessionEventPinLayout(event);
  const attendees = Array.isArray(event.attendingFriends) ? event.attendingFriends : [];
  const finalCardHeight = geometry.cardHeight ?? DEFAULT_CARD_HEIGHT;
  const finalImageSize = geometry.imageSize ?? DEFAULT_IMAGE_SIZE;
  const posterPadding = geometry.posterPadding ?? POSTER_PADDING;
  const posterTopPadding = geometry.posterTopPadding ?? POSTER_TOP_PADDING;
  const posterHeaderHeight = geometry.posterHeaderHeight ?? POSTER_HEADER_HEIGHT;
  const posterImageGap = geometry.posterImageGap ?? POSTER_IMAGE_GAP;
  const posterBottomGap = geometry.posterBottomGap ?? POSTER_BOTTOM_GAP;
  const posterMetaHeight = geometry.posterMetaHeight ?? POSTER_META_HEIGHT;
  const posterBottomPadding = geometry.posterBottomPadding ?? POSTER_BOTTOM_PADDING;

  const imageTop = posterTopPadding + posterHeaderHeight + posterImageGap;
  const naturalFooterTop = imageTop + finalImageSize + posterBottomGap;
  const footerTop = Math.max(
    naturalFooterTop,
    finalCardHeight - posterBottomPadding - posterMetaHeight
  );

  const title = String(event.title ?? "").toUpperCase();
  const priceLabel = event.price?.toUpperCase?.() ?? "";
  const entranceLabel = [priceLabel, "ENTRADA"].filter(Boolean).join(" | ");
  const addressLabel = event.locationName ?? "";
  const organizerName =
    event.organizerName ?? event.establishmentName ?? event.hostName ?? "LisTunes";
  const posterDate = getPosterDateParts(event);

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
      borderTopLeftRadius: interpolate(value, [0, 1], [layout.circleSize / 2, 0]),
      borderTopRightRadius: interpolate(value, [0, 1], [layout.circleSize / 2, 0]),
      height: interpolate(value, [0, 1], [layout.circleSize, finalImageSize]),
      left: interpolate(value, [0, 1], [layout.circleOffset, posterPadding]),
      overflow: "hidden",
      top: interpolate(value, [0, 1], [layout.circleOffset, imageTop]),
      width: interpolate(value, [0, 1], [layout.circleSize, finalImageSize]),
    };
  }, [finalImageSize, imageTop, layout.circleOffset, layout.circleSize, posterPadding]);

  const imageBorderStyle = useAnimatedStyle(() => {
    const value = progress.value;

    return {
      borderColor: IMAGE_BORDER_COLOR,
      borderWidth: interpolate(value, [0, 1], [0, IMAGE_BORDER_WIDTH]),
      height: interpolate(value, [0, 1], [layout.circleSize, finalImageSize]),
      left: interpolate(value, [0, 1], [layout.circleOffset, posterPadding]),
      top: interpolate(value, [0, 1], [layout.circleOffset, imageTop]),
      width: interpolate(value, [0, 1], [layout.circleSize, finalImageSize]),
    };
  }, [finalImageSize, imageTop, layout.circleOffset, layout.circleSize, posterPadding]);

  const posterContentStyle = useAnimatedStyle(() => ({
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
        style={[styles.imageBorder, imageBorderStyle]}
      />

      <Animated.View style={[styles.thumbnailClip, thumbnailClipStyle]}>
        <Animated.Image
          accessibilityLabel={`${title} thumbnail`}
          resizeMode="cover"
          source={getEventImage(event.thumbnailKey)}
          style={styles.thumbnail}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="box-none"
        style={[styles.posterContent, posterContentStyle]}
      >
        <View
          style={[
            styles.posterHeader,
            {
              height: posterHeaderHeight,
              left: posterPadding,
              right: posterPadding,
              top: posterTopPadding,
            },
          ]}
        >
          <View style={styles.posterTitleColumn}>
            <Text numberOfLines={3} style={styles.posterTitle}>
              {title}
            </Text>

            <View style={styles.posterAvatarRow}>
              <PreviewAttendeeStack attendees={attendees} />
            </View>
          </View>

          <View style={styles.posterRightColumn}>
            <View style={styles.posterDateBlock}>
              <View style={styles.posterDateTextGroup}>
                <Text style={styles.posterDateMain}>{posterDate.main}</Text>
                <Text style={styles.posterDateSub}>{posterDate.sub}</Text>
              </View>
            </View>

            <Text numberOfLines={1} style={styles.organizerName}>
              {organizerName}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.posterFooter,
            {
              height: posterMetaHeight,
              left: posterPadding,
              right: posterPadding,
              top: footerTop,
            },
          ]}
        >
          <View style={styles.posterMeta}>
            <Text style={styles.posterMetaText}>{entranceLabel}</Text>
            <Text numberOfLines={1} style={styles.posterMetaText}>
              {addressLabel}
            </Text>
          </View>

          <Pressable
            accessibilityLabel={`Open details for ${event.title}`}
            accessibilityRole="button"
            onPress={handleOpenPress}
            style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
          >
            <Ionicons
              name="arrow-forward"
              size={ACTION_ICON_SIZE}
              color={colors.primary}
            />
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
  imageBorder: {
    position: "absolute",
    zIndex: 4,
  },
  thumbnail: {
    height: "100%",
    width: "100%",
  },
  pressed: {
    opacity: 0.72,
  },
  posterContent: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  posterHeader: {
    flexDirection: "row",
    position: "absolute",
  },
  posterTitleColumn: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  posterTitle: {
    color: colors.text,
    fontSize: POSTER_TITLE_FONT_SIZE,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: POSTER_TITLE_LINE_HEIGHT,
  },
  posterAvatarRow: {
    marginTop: 12,
  },
  posterRightColumn: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: 86,
  },
  posterDateBlock: {
    height: 112,
    overflow: "visible",
    position: "relative",
    width: 86,
  },
  posterDateTextGroup: {
    alignItems: "flex-end",
    position: "absolute",
    right: -36,
    top: 36,
    transform: [{ rotate: "90deg" }],
    width: 112,
  },
  posterDateMain: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 25,
  },
  posterDateSub: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 15,
    marginTop: 2,
  },
  organizerName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 23,
    textAlign: "right",
  },
  posterFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
  },
  posterMeta: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  posterMetaText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 18,
  },
  arrowButton: {
    alignItems: "center",
    backgroundColor: colors.text,
    borderRadius: ACTION_BUTTON_SIZE / 2,
    height: ACTION_BUTTON_SIZE,
    justifyContent: "center",
    width: ACTION_BUTTON_SIZE,
  },
  avatarStack: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    minHeight: CARD_AVATAR_SIZE,
  },
  emptyStack: {
    minHeight: CARD_AVATAR_SIZE,
    width: CARD_AVATAR_SIZE,
  },
  avatar: {
    borderColor: colors.secondary,
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
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 19,
  },
});
