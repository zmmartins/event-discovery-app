import { Image, StyleSheet, View } from "react-native";

import { colors } from "../theme/colors";

const PIN_SIZE = 82;
const PIN_BORDER_WIDTH = 6;
const TAIL_HEIGHT = 42;
const TAIL_WIDTH = 26;
const AVATAR_SIZE = 32;
const AVATAR_BORDER_WIDTH = 3;
const MIN_CLOUD_RADIUS = 54;
const MAX_CLOUD_RADIUS = 76;

const avatarMap = {
  ana: require("../assets/avatars/ana.png"),
  clara: require("../assets/avatars/clara.png"),
  ines: require("../assets/avatars/ines.png"),
  joao: require("../assets/avatars/joao.png"),
  miguel: require("../assets/avatars/miguel.png"),
  rita: require("../assets/avatars/rita.png"),
};

const eventMap = {
  "art-gallery": require("../assets/events/art-gallery.png"),
  "film-night": require("../assets/events/film-night.png"),
  "rooftop-jazz": require("../assets/events/rooftop-jazz.png"),
};

const avatarPositions = [
  { x: -34, y: -24 },
  { x: 34, y: -25 },
  { x: 46, y: 12 },
  { x: -42, y: 24 },
];

const particleLayers = [
  { count: 26, size: 10, opacity: 0.92 },
  { count: 34, size: 7, opacity: 0.68 },
  { count: 42, size: 4, opacity: 0.44 },
];

const discoverParticleLayers = [
  { count: 34, size: 7, opacity: 0.94 },
  { count: 44, size: 5, opacity: 0.72 },
  { count: 58, size: 3, opacity: 0.52 },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getEventImage(key) {
  return eventMap[key] || eventMap["art-gallery"];
}

function getAvatarImage(key) {
  return avatarMap[key] || avatarMap.ana;
}

function hashString(value) {
  return String(value ?? "")
    .split("")
    .reduce((hash, character) => {
      return (hash * 31 + character.charCodeAt(0)) % 9973;
    }, 11);
}

function getCloudRadius(popularity) {
  const normalizedPopularity = clamp(Number(popularity) || 0, 0, 100);
  const popularityRatio = normalizedPopularity / 100;

  return MIN_CLOUD_RADIUS + (MAX_CLOUD_RADIUS - MIN_CLOUD_RADIUS) * popularityRatio;
}

function createParticles(eventId, cloudRadius, isDiscoverMode = false) {
  const seed = hashString(eventId);
  const particles = [];
  const layers = isDiscoverMode ? discoverParticleLayers : particleLayers;
  const innerRadius = PIN_SIZE / 2 + 8;
  const radiusStep = (cloudRadius - innerRadius) / (layers.length - 1);

  layers.forEach((layer, layerIndex) => {
    const layerRadius = innerRadius + radiusStep * layerIndex;

    for (let index = 0; index < layer.count; index += 1) {
      const angle =
        (Math.PI * 2 * index) / layer.count +
        (seed % 360) * 0.004 +
        layerIndex * 0.22;
      const wave = Math.sin(seed * 0.17 + index * 1.7 + layerIndex);
      const radius = layerRadius + wave * (layer.size * 0.45);
      const dotSize = Math.max(3, layer.size + ((seed + index) % 3) - 1);

      particles.push({
        id: `${layerIndex}-${index}`,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        opacity: layer.opacity,
        size: dotSize,
      });
    }
  });

  return particles;
}

export default function EventPin({ event, isDiscoverMode = false }) {
  const { attendingFriends = [], id, popularity = 0, thumbnailKey } = event;
  const cloudRadius = isDiscoverMode
    ? Math.max(getCloudRadius(popularity), 86)
    : getCloudRadius(popularity);
  const contentRadius = Math.max(cloudRadius, 58);
  const containerSize = contentRadius * 2;
  const particles = createParticles(id, cloudRadius, isDiscoverMode);
  const avatars = attendingFriends.slice(0, 4);
  const circleOffset = contentRadius - PIN_SIZE / 2;
  const tailTop = circleOffset + PIN_SIZE - 2;
  const tailTipY = tailTop + TAIL_HEIGHT;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          height: tailTipY,
          width: containerSize,
        },
      ]}
    >
      <View
        style={[
          styles.cloud,
          {
            height: containerSize,
            width: containerSize,
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
                left: contentRadius + particle.x - particle.size / 2,
                opacity: particle.opacity,
                top: contentRadius + particle.y - particle.size / 2,
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
            left: circleOffset,
            top: circleOffset,
          },
        ]}
      >
        <Image
          source={getEventImage(thumbnailKey)}
          style={styles.thumbnail}
        />

        {avatars.map((avatar, index) => {
          const position = avatarPositions[index];

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
            left: contentRadius - TAIL_WIDTH / 2,
            top: tailTop,
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
    height: PIN_SIZE,
    justifyContent: "center",
    overflow: "visible",
    position: "absolute",
    width: PIN_SIZE,
    zIndex: 2,
  },
  thumbnail: {
    borderRadius: (PIN_SIZE - PIN_BORDER_WIDTH * 2) / 2,
    height: PIN_SIZE - PIN_BORDER_WIDTH * 2,
    resizeMode: "cover",
    width: PIN_SIZE - PIN_BORDER_WIDTH * 2,
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
