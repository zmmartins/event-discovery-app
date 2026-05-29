import { Image, StyleSheet, View } from "react-native";

import { colors } from "../theme/colors";
import { getAvatarImage, getEventImage } from "../utils/imageAssets";
import PopularityAura, { getPopularityAuraConfig } from "./PopularityAura";

const PIN_SIZE = 60;
const PIN_BORDER_WIDTH = 2;
const PIN_IMAGE_SIZE = PIN_SIZE - PIN_BORDER_WIDTH * 2;
const TAIL_HEIGHT = 5;
const TAIL_WIDTH = 12;
const AVATAR_SIZE = 18;
const AVATAR_BORDER_WIDTH = 2;

export const EVENT_PIN_METRICS = {
  circleSize: PIN_SIZE,
  imageSize: PIN_IMAGE_SIZE,
  tailHeight: TAIL_HEIGHT,
  tailWidth: TAIL_WIDTH,
  visualHeight: PIN_SIZE + TAIL_HEIGHT,
  visualWidth: PIN_SIZE,
};

export const EVENT_PIN_AVATAR_POSITIONS = [
  { x: -22, y: -17 },
  { x: 22, y: -17 },
  { x: 25, y: 8 },
  { x: -25, y: 10 },
];

export function getEventPinLayout(event = {}) {
  const { auraSize } = getPopularityAuraConfig(event.popularity);
  const contentRadius = Math.ceil(Math.max(auraSize, PIN_SIZE) / 2);
  const containerSize = contentRadius * 2;
  const circleOffset = contentRadius - PIN_SIZE / 2;
  const auraOffset = contentRadius - auraSize / 2;
  const tailTop = circleOffset + PIN_SIZE;
  const tailTipY = tailTop + TAIL_HEIGHT;
  const containerHeight = Math.max(containerSize, tailTipY);

  return {
    auraOffset,
    auraSize,
    circleOffset,
    containerHeight,
    containerSize,
    contentRadius,
    tailTipY,
    tailTop,
  };
}

export function getEventPinMarkerAnchor(event) {
  const layout = getEventPinLayout(event);

  return {
    x: 0.5,
    y: layout.tailTipY / layout.containerHeight,
  };
}

export default function EventPin({
  centerImageAccessibilityLabel,
  centerImageSource,
  event = {},
  showPopularityAura = true,
}) {
  const {
    attendingFriends = [],
    thumbnailKey,
    title = "Event",
  } = event;
  const layout = getEventPinLayout(event);
  const avatars = attendingFriends.slice(0, 4);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          height: layout.containerHeight,
          width: layout.containerSize,
        },
      ]}
    >
      {showPopularityAura && (
        <PopularityAura
          animated={false}
          popularity={event.popularity}
          style={{
            left: layout.auraOffset,
            top: layout.auraOffset,
          }}
        />
      )}

      <View
        style={[
          styles.pin,
          {
            left: layout.circleOffset,
            top: layout.circleOffset,
          },
        ]}
      >
        <Image
          accessibilityLabel={centerImageAccessibilityLabel ?? `${title} thumbnail`}
          source={centerImageSource ?? getEventImage(thumbnailKey)}
          style={styles.thumbnail}
        />

        {avatars.map((avatar, index) => {
          const position = EVENT_PIN_AVATAR_POSITIONS[index];

          return (
            <View
              key={avatar.id || `${avatar.name}-${index}`}
              style={[
                styles.avatarWrap,
                {
                  left: PIN_SIZE / 2 + position.x - AVATAR_SIZE / 2,
                  top: PIN_SIZE / 2 + position.y - AVATAR_SIZE / 2,
                },
              ]}
            >
              <Image
                accessibilityLabel={avatar.name}
                source={getAvatarImage(avatar.avatarKey)}
                style={styles.avatar}
              />
            </View>
          );
        })}
      </View>

      <View
        style={[
          styles.tail,
          {
            left: layout.contentRadius - TAIL_WIDTH / 2,
            top: layout.tailTop,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "visible",
  },
  pin: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: PIN_SIZE / 2,
    elevation: 5,
    height: PIN_SIZE,
    justifyContent: "center",
    overflow: "visible",
    position: "absolute",
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    width: PIN_SIZE,
    zIndex: 2,
  },
  thumbnail: {
    borderRadius: PIN_IMAGE_SIZE / 2,
    height: PIN_IMAGE_SIZE,
    resizeMode: "cover",
    width: PIN_IMAGE_SIZE,
  },
  avatarWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.secondary,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: AVATAR_BORDER_WIDTH,
    height: AVATAR_SIZE,
    justifyContent: "center",
    overflow: "hidden",
    position: "absolute",
    width: AVATAR_SIZE,
    zIndex: 3,
  },
  avatar: {
    borderRadius: (AVATAR_SIZE - AVATAR_BORDER_WIDTH * 2) / 2,
    height: AVATAR_SIZE - AVATAR_BORDER_WIDTH * 2,
    width: AVATAR_SIZE - AVATAR_BORDER_WIDTH * 2,
  },
  tail: {
    borderLeftColor: "transparent",
    borderLeftWidth: TAIL_WIDTH / 2,
    borderRightColor: "transparent",
    borderRightWidth: TAIL_WIDTH / 2,
    borderTopColor: colors.primary,
    borderTopWidth: TAIL_HEIGHT,
    height: 0,
    position: "absolute",
    width: 0,
    zIndex: 1,
  },
});
