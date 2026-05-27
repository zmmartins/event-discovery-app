import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { toggleSavedEvent } from "../services/eventService";
import {
  LOG_ACTIONS,
  logInteraction,
} from "../services/interactionLogService";
import { colors } from "../theme/colors";

const thumbnailImages = {
  "art-gallery": require("../assets/events/art-gallery.png"),
  "film-night": require("../assets/events/film-night.png"),
  "rooftop-jazz": require("../assets/events/rooftop-jazz.png"),
};

const avatarImages = {
  ana: require("../assets/avatars/ana.png"),
  clara: require("../assets/avatars/clara.png"),
  ines: require("../assets/avatars/ines.png"),
  joao: require("../assets/avatars/joao.png"),
  miguel: require("../assets/avatars/miguel.png"),
  rita: require("../assets/avatars/rita.png"),
};

function AttendeeStack({ attendees }) {
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
          key={friend.id}
          source={avatarImages[friend.avatarKey] ?? avatarImages.ana}
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

export default function EventCard({
  event,
  onOpen,
  onSavedChange,
  screen = "EventCard",
  source = "event_card",
}) {
  const pathname = usePathname();
  const saveScale = useRef(new Animated.Value(1)).current;
  const [isSaved, setIsSaved] = useState(Boolean(event.isSaved));
  const price = event.price?.toUpperCase?.() ?? "";

  useEffect(() => {
    setIsSaved(Boolean(event.isSaved));
  }, [event.id, event.isSaved]);

  function animateSavePulse() {
    saveScale.setValue(0.82);
    Animated.spring(saveScale, {
      damping: 8,
      mass: 0.45,
      stiffness: 320,
      toValue: 1,
      useNativeDriver: true,
    }).start();
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
    <View style={styles.card}>
      <Image
        accessibilityLabel={`${event.title} thumbnail`}
        source={thumbnailImages[event.thumbnailKey] ?? thumbnailImages["art-gallery"]}
        style={styles.thumbnail}
      />

      <View style={styles.info}>
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
            <Animated.View style={{ transform: [{ scale: saveScale }] }}>
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

        <View style={styles.footerRow}>
          <AttendeeStack attendees={event.attendingFriends} />

          <Pressable
            accessibilityLabel={`Open details for ${event.title}`}
            accessibilityRole="button"
            onPress={handleOpenPress}
            style={({ pressed }) => [
              styles.detailsButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.detailsButtonText}>CHECK US</Text>
            <Text style={styles.detailsButtonText}>OUT</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    elevation: 3,
    flexDirection: "row",
    height: 216,
    minHeight: 216,
    padding: 10,
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  thumbnail: {
    borderRadius: 8,
    height: 196,
    width: 119,
  },
  info: {
    flex: 1,
    justifyContent: "space-between",
    marginLeft: 12,
    minWidth: 0,
    paddingVertical: 6,
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
    marginTop: 2,
  },
  price: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 2,
  },
  footerRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  avatarStack: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 26,
  },
  emptyStack: {
    minHeight: 26,
    width: 24,
  },
  avatar: {
    borderColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    height: 24,
    width: 24,
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  moreAvatar: {
    alignItems: "center",
    backgroundColor: colors.iconMuted,
    justifyContent: "center",
  },
  moreAvatarText: {
    color: colors.surface,
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 20,
  },
  detailsButton: {
    alignItems: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 5,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 62,
    paddingHorizontal: 6,
  },
  detailsButtonText: {
    color: colors.iconActive,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 10,
  },
  pressed: {
    opacity: 0.72,
  },
});
