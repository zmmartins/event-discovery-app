import { Image, StyleSheet, View } from "react-native";

import { colors } from "../theme/colors";
import { getEventPinImage } from "../utils/imageAssets";

const MIN_PIN_SIZE = 42;
const MAX_PIN_SIZE = 86;
const GREEN_BORDER_WIDTH = 3;
const MIN_FRIEND_BORDER_WIDTH = 2;
const MAX_FRIEND_BORDER_WIDTH = 5;
const FRIEND_BORDER_MAX_COUNT = 5;
const OUTER_PADDING = 2;

export const EVENT_PIN_METRICS = {
  minCircleSize: MIN_PIN_SIZE,
  maxCircleSize: MAX_PIN_SIZE,
  greenBorderWidth: GREEN_BORDER_WIDTH,
  minFriendBorderWidth: MIN_FRIEND_BORDER_WIDTH,
  maxFriendBorderWidth: MAX_FRIEND_BORDER_WIDTH,

  circleSize: MAX_PIN_SIZE,
  imageSize: MAX_PIN_SIZE,
  tailHeight: 0,
  tailWidth: 0,
  visualHeight: MAX_PIN_SIZE,
  visualWidth: MAX_PIN_SIZE,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getEventPopularitySize(popularity) {
  const normalized = clamp(Number(popularity) || 0, 0, 100) / 100;
  return MIN_PIN_SIZE + (MAX_PIN_SIZE - MIN_PIN_SIZE) * normalized;
}

export function getEventFriendCount(event = {}) {
  return Array.isArray(event.attendingFriends) ? event.attendingFriends.length : 0;
}

export function getFriendBorderWidth(event = {}) {
  const friendCount = getEventFriendCount(event);

  if (friendCount <= 0) return 0;
  if (FRIEND_BORDER_MAX_COUNT <= 1) return MAX_FRIEND_BORDER_WIDTH;

  const normalized = clamp((friendCount - 1) / (FRIEND_BORDER_MAX_COUNT - 1), 0, 1);

  return (
    MIN_FRIEND_BORDER_WIDTH +
    (MAX_FRIEND_BORDER_WIDTH - MIN_FRIEND_BORDER_WIDTH) * normalized
  );
}

export function getEventPinLayout(event = {}) {
  const circleSize = getEventPopularitySize(event.popularity);
  const friendBorderWidth = getFriendBorderWidth(event);
  const outerSize =
    circleSize + GREEN_BORDER_WIDTH * 2 + friendBorderWidth * 2 + OUTER_PADDING * 2;

  const circleOffset = outerSize / 2 - circleSize / 2;

  return {
    circleOffset,
    circleSize,
    friendBorderWidth,
    greenBorderWidth: GREEN_BORDER_WIDTH,
    imageSize: circleSize,
    outerSize,
  };
}

const sessionEventPinLayoutCache = new Map();

export function getSessionEventPinLayout(event = {}) {
  const eventId = event?.id;

  if (!eventId) {
    return getEventPinLayout(event);
  }

  if (!sessionEventPinLayoutCache.has(eventId)) {
    sessionEventPinLayoutCache.set(eventId, getEventPinLayout(event));
  }

  return sessionEventPinLayoutCache.get(eventId);
}

export function clearSessionEventPinLayoutCache() {
  sessionEventPinLayoutCache.clear();
}

export function getEventPinMarkerAnchor(event) {
  return {
    x: 0.5,
    y: 0.5,
  };
}

export default function EventPin({
  centerImageAccessibilityLabel,
  centerImageSource,
  event = {},
  onImageLoad,
}) {
  const { thumbnailKey, title = "Event" } = event;
  const layout = getSessionEventPinLayout(event);

  return (
    <View
      collapsable={false}
      pointerEvents="none"
      style={[
        styles.container,
        {
          height: layout.outerSize,
          width: layout.outerSize,
        },
      ]}
    >
      {layout.friendBorderWidth > 0 && (
        <View
          style={[
            styles.friendRing,
            {
              borderRadius: layout.outerSize / 2,
              borderWidth: layout.friendBorderWidth,
              height: layout.outerSize,
              width: layout.outerSize,
            },
          ]}
        />
      )}

      <View
        style={[
          styles.greenRing,
          {
            borderRadius: (layout.circleSize + GREEN_BORDER_WIDTH * 2) / 2,
            borderWidth: GREEN_BORDER_WIDTH,
            height: layout.circleSize + GREEN_BORDER_WIDTH * 2,
            left: layout.friendBorderWidth + OUTER_PADDING,
            top: layout.friendBorderWidth + OUTER_PADDING,
            width: layout.circleSize + GREEN_BORDER_WIDTH * 2,
          },
        ]}
      >
        <Image
          accessibilityLabel={centerImageAccessibilityLabel ?? `${title} thumbnail`}
          onLoadEnd={onImageLoad}
          source={centerImageSource ?? getEventPinImage(thumbnailKey)}
          style={[
            styles.thumbnail,
            {
              borderRadius: layout.circleSize / 2,
              height: layout.circleSize,
              width: layout.circleSize,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  friendRing: {
    borderColor: colors.secondary,
    position: "absolute",
  },
  greenRing: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    justifyContent: "center",
    overflow: "hidden",
    position: "absolute",
  },
  thumbnail: {
    resizeMode: "cover",
  },
});
