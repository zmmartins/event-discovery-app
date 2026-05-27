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
import { getAvatarImage } from "../utils/imageAssets";

const monthLabels = [
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

function formatAttendedDate(value) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "PAST EXPERIENCE";

  return `${monthLabels[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

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

export default function ProfileExperienceCard({
  event,
  experience,
  onOpen,
  onSavedChange,
  screen = "ProfileScreen",
  source = "profile_list",
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
        experienceId: experience.id,
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
    logInteraction(LOG_ACTIONS.profileExperienceOpened, {
      eventId: event.id,
      experienceId: experience.id,
      route: pathname,
      screen,
      source,
    }).catch(() => null);
    onOpen?.();
  }

  return (
    <Pressable
      accessibilityLabel={`Open details for ${event.title}`}
      accessibilityRole="button"
      onPress={handleOpenPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text numberOfLines={2} style={styles.title}>
            {event.title}
          </Text>
          <Text style={styles.date}>{formatAttendedDate(experience.attendedAt)}</Text>
        </View>

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
              size={21}
              color={isSaved ? colors.primary : colors.iconMuted}
            />
          </Animated.View>
        </Pressable>
      </View>

      <Text numberOfLines={1} style={styles.address}>
        {event.locationName}
      </Text>

      <View style={styles.footerRow}>
        <View>
          <Text style={styles.price}>{price}</Text>
          <AttendeeStack attendees={event.attendingFriends} />
        </View>

        <Pressable
          accessibilityLabel={`Open details for ${event.title}`}
          accessibilityRole="button"
          onPress={handleOpenPress}
          style={({ pressed }) => [styles.detailsButton, pressed && styles.pressed]}
        >
          <Text style={styles.detailsButtonText}>CHECK US</Text>
          <Text style={styles.detailsButtonText}>OUT</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    elevation: 3,
    minHeight: 128,
    padding: 14,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  cardPressed: {
    opacity: 0.92,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 19,
  },
  date: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 4,
  },
  saveButton: {
    alignItems: "center",
    borderRadius: 12,
    height: 30,
    justifyContent: "center",
    marginTop: -3,
    width: 28,
  },
  address: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
  footerRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  price: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 5,
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
    backgroundColor: "#8A8A8A",
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
    borderRadius: 6,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 68,
    paddingHorizontal: 7,
  },
  detailsButtonText: {
    color: colors.surface,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 10,
  },
  pressed: {
    opacity: 0.72,
  },
});
