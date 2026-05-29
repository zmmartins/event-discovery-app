import { Image, StyleSheet, View } from "react-native";

import { colors } from "../theme/colors";
import { getAvatarImage, getEventImage } from "../utils/imageAssets";

const PIN_SIZE = 60;
const PIN_BORDER_WIDTH = 2;
const PIN_IMAGE_SIZE = PIN_SIZE - PIN_BORDER_WIDTH * 2;
const TAIL_HEIGHT = 5;
const TAIL_WIDTH = 12;
const AVATAR_SIZE = 18;
const AVATAR_BORDER_WIDTH = 2;
const MIN_PARTICLE_RINGS = 1;
const MAX_PARTICLE_RINGS = 5;
const FIRST_RING_RADIUS = PIN_SIZE / 2 + 7;
const RING_GAP = 6;
const INNER_PARTICLE_SIZE = 5.5;
const OUTER_PARTICLE_SIZE = 2.8;
const INNER_PARTICLE_OPACITY = 0.92;
const OUTER_PARTICLE_OPACITY = 0.42;

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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hashString(value) {
  return String(value ?? "")
    .split("")
    .reduce((hash, character) => {
      return (hash * 31 + character.charCodeAt(0)) % 9973;
    }, 11);
}

function getParticleRingCount(popularity) {
  const normalizedPopularity = clamp(Number(popularity) || 0, 0, 100);
  const ringCount = Math.ceil((normalizedPopularity / 100) * MAX_PARTICLE_RINGS);

  return clamp(ringCount, MIN_PARTICLE_RINGS, MAX_PARTICLE_RINGS);
}

export function getEventPinLayout(event = {}) {
  const ringCount = getParticleRingCount(event.popularity);
  const ringGap = RING_GAP;
  const firstRingRadius = FIRST_RING_RADIUS;
  const outerRingRadius = firstRingRadius + ringGap * (ringCount - 1);
  const contentRadius = Math.ceil(outerRingRadius + 6);
  const containerSize = contentRadius * 2;
  const circleOffset = contentRadius - PIN_SIZE / 2;
  const tailTop = circleOffset + PIN_SIZE;
  const tailTipY = tailTop + TAIL_HEIGHT;
  const containerHeight = Math.max(containerSize, tailTipY);

  return {
    circleOffset,
    containerHeight,
    containerSize,
    contentRadius,
    firstRingRadius,
    ringCount,
    ringGap,
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

export function getEventPinParticles(eventId, layout, isDiscoverMode = false) {
  const seed = hashString(eventId);
  const particles = [];

  for (let ringIndex = 0; ringIndex < layout.ringCount; ringIndex += 1) {
    const ringRadius = layout.firstRingRadius + layout.ringGap * ringIndex;
    const dotCount = 14 + ringIndex * 5;
    const ringProgress =
      MAX_PARTICLE_RINGS === 1 ? 0 : ringIndex / (MAX_PARTICLE_RINGS - 1);
    const angleOffset =
      ((seed % 360) * Math.PI) / 180 + ringIndex * (isDiscoverMode ? 0.24 : 0.18);
    const dotSize = clamp(
      INNER_PARTICLE_SIZE -
        (INNER_PARTICLE_SIZE - OUTER_PARTICLE_SIZE) * ringProgress,
      OUTER_PARTICLE_SIZE,
      INNER_PARTICLE_SIZE,
    );
    const opacity = clamp(
      INNER_PARTICLE_OPACITY -
        (INNER_PARTICLE_OPACITY - OUTER_PARTICLE_OPACITY) * ringProgress +
        (isDiscoverMode ? 0.04 : 0),
      OUTER_PARTICLE_OPACITY,
      0.96,
    );

    for (let index = 0; index < dotCount; index += 1) {
      const angle = (Math.PI * 2 * index) / dotCount + angleOffset;

      particles.push({
        id: `${ringIndex}-${index}`,
        opacity,
        size: dotSize,
        x: Math.cos(angle) * ringRadius,
        y: Math.sin(angle) * ringRadius,
      });
    }
  }

  return particles;
}

export default function EventPin({
  centerImageAccessibilityLabel,
  centerImageSource,
  event = {},
  isDiscoverMode = false,
}) {
  const {
    attendingFriends = [],
    id,
    thumbnailKey,
    title = "Event",
  } = event;
  const layout = getEventPinLayout(event);
  const particles = getEventPinParticles(id, layout, isDiscoverMode);
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
      <View
        style={[
          styles.cloud,
          {
            height: layout.containerSize,
            width: layout.containerSize,
          },
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
      </View>

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
  cloud: {
    left: 0,
    position: "absolute",
    top: 0,
  },
  particle: {
    backgroundColor: colors.secondary,
    position: "absolute",
  },
  discoverParticle: {
    backgroundColor: colors.secondary,
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
