import { Image, StyleSheet, View } from "react-native";

import { colors } from "../theme/colors";
import { getEventImage } from "../utils/imageAssets";

const PIN_SIZE = 60;
const PIN_BORDER_WIDTH = 2;
const PIN_IMAGE_SIZE = PIN_SIZE - PIN_BORDER_WIDTH * 2;
const TAIL_HEIGHT = 18;
const TAIL_WIDTH = 12;
const MAX_PARTICLE_RINGS = 3;
const FIRST_RING_RADIUS = PIN_SIZE / 2 + 4;
const RING_GAP = 5;
const PARTICLE_COUNTS_BY_RING = [20, 25, 30];
const PARTICLE_SIZE_SCALE = 0.78;
const PARTICLE_SIZE_TEMPLATES = [[7], [5], [3]];
const PARTICLE_OPACITY_TEMPLATES = [[1], [0.75], [0.5]];
const ANGLE_JITTER_DEGREES = 0.8;
const RADIUS_JITTER = 0.35;

export const EVENT_PIN_METRICS = {
  circleSize: PIN_SIZE,
  imageSize: PIN_IMAGE_SIZE,
  tailHeight: TAIL_HEIGHT,
  tailWidth: TAIL_WIDTH,
  visualHeight: PIN_SIZE + TAIL_HEIGHT,
  visualWidth: PIN_SIZE,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hashString(value = "event") {
  const stringValue = String(value);
  let hash = 0;

  for (let index = 0; index < stringValue.length; index += 1) {
    hash = (hash * 31 + stringValue.charCodeAt(index)) % 2147483647;
  }

  return Math.abs(hash) || 1;
}

function seededNoise(seed, ringIndex, particleIndex, salt = 0) {
  const value =
    Math.sin(
      seed * 12.9898 + ringIndex * 78.233 + particleIndex * 37.719 + salt * 19.19
    ) * 43758.5453;

  return value - Math.floor(value);
}

function getParticleRingCount(popularity) {
  const normalizedPopularity = clamp(Number(popularity) || 0, 0, 100);

  if (normalizedPopularity >= 70) return MAX_PARTICLE_RINGS;
  if (normalizedPopularity >= 40) return 2;
  if (normalizedPopularity >= 15) return 1;

  return 0;
}

function getTemplateValue(template, index, count) {
  const position = (index / count) * template.length;
  const lowerIndex = Math.floor(position) % template.length;
  const upperIndex = (lowerIndex + 1) % template.length;
  const mix = position - Math.floor(position);

  return template[lowerIndex] + (template[upperIndex] - template[lowerIndex]) * mix;
}

function createParticles(eventId, layout, isDiscoverMode = false) {
  const seed = hashString(eventId);
  const particles = [];

  for (let ringIndex = 0; ringIndex < layout.ringCount; ringIndex += 1) {
    const ringRadius = layout.firstRingRadius + layout.ringGap * ringIndex;
    const dotCount = PARTICLE_COUNTS_BY_RING[ringIndex];
    const sizeTemplate = PARTICLE_SIZE_TEMPLATES[ringIndex];
    const opacityTemplate = PARTICLE_OPACITY_TEMPLATES[ringIndex];
    const baseRotation =
      ((seed % 360) * Math.PI) / 180 + ringIndex * (isDiscoverMode ? 0.09 : 0.06);

    for (let index = 0; index < dotCount; index += 1) {
      const baseAngle = (Math.PI * 2 * index) / dotCount;
      const angleJitter =
        (seededNoise(seed, ringIndex, index, 1) - 0.5) *
        ((ANGLE_JITTER_DEGREES * Math.PI) / 180) *
        2;
      const radiusJitter =
        (seededNoise(seed, ringIndex, index, 2) - 0.5) * RADIUS_JITTER * 2;
      const scaleNoise = 1 + (seededNoise(seed, ringIndex, index, 3) - 0.5) * 0.08;
      const opacityNoise = 1 + (seededNoise(seed, ringIndex, index, 4) - 0.5) * 0.06;
      const angle = baseAngle + baseRotation + angleJitter;
      const particleRadius = ringRadius + radiusJitter;
      const size =
        getTemplateValue(sizeTemplate, index, dotCount) *
        PARTICLE_SIZE_SCALE *
        scaleNoise;
      const opacity = clamp(
        getTemplateValue(opacityTemplate, index, dotCount) * opacityNoise +
          (isDiscoverMode ? 0.02 : 0),
        0.35,
        1
      );

      particles.push({
        id: `${ringIndex}-${index}`,
        opacity,
        ringIndex,
        size,
        x: Math.cos(angle) * particleRadius,
        y: Math.sin(angle) * particleRadius,
      });
    }
  }

  return particles;
}

export function getEventPinLayout(event = {}) {
  const ringCount = getParticleRingCount(event.popularity);
  const ringGap = RING_GAP;
  const firstRingRadius = FIRST_RING_RADIUS;
  const outerRingRadius =
    ringCount > 0 ? firstRingRadius + ringGap * (ringCount - 1) : PIN_SIZE / 2;

  const contentRadius = Math.ceil(outerRingRadius + 4.5);
  const containerSize = contentRadius * 2;
  const circleOffset = contentRadius - PIN_SIZE / 2;
  const tailTop = circleOffset + PIN_SIZE - 1;
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

export function EventPinParticles({
  event = {},
  isDiscoverMode = false,
  layout = getEventPinLayout(event),
  style,
}) {
  const particles = createParticles(
    event.id ?? event.title ?? "event",
    layout,
    isDiscoverMode
  );

  if (layout.ringCount === 0 || particles.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.particleLayer,
        {
          height: layout.containerHeight,
          width: layout.containerSize,
        },
        style,
      ]}
    >
      {particles.map((particle) => (
        <View
          key={particle.id}
          style={[
            styles.particle,
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
  );
}

export default function EventPin({
  centerImageAccessibilityLabel,
  centerImageSource,
  event = {},
  isDiscoverMode = false,
  showPopularityAura = true,
}) {
  const { thumbnailKey, title = "Event" } = event;
  const layout = getEventPinLayout(event);

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
        <EventPinParticles
          event={event}
          isDiscoverMode={isDiscoverMode}
          layout={layout}
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
  particleLayer: {
    left: 0,
    overflow: "visible",
    position: "absolute",
    top: 0,
    zIndex: 0,
  },
  particle: {
    backgroundColor: colors.secondary,
    position: "absolute",
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
