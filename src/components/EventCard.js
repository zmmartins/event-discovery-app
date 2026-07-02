import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { formatEventCardDate } from "../domain/events/eventFormatters";
import { toggleSavedEvent } from "../services/eventService";
import { LOG_ACTIONS, logInteraction } from "../services/interactionLogService";
import { colors } from "../theme/colors";
import { getAvatarImage, getEventPreviewImage } from "../utils/imageAssets";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getThumbnailHeight(source, columnWidth) {
  const asset = Image.resolveAssetSource(source);
  const aspectRatio =
    Number.isFinite(asset?.width) &&
    Number.isFinite(asset?.height) &&
    asset.width > 0 &&
    asset.height > 0
      ? asset.width / asset.height
      : 1;
  const rawHeight = columnWidth / aspectRatio;

  return clamp(rawHeight, columnWidth * 0.62, columnWidth * 1.45);
}

function VerticalAttendeeStack({ attendees }) {
  const safeAttendees = Array.isArray(attendees) ? attendees : [];
  const hasOverflow = safeAttendees.length > 2;
  const visibleAttendees = hasOverflow
    ? safeAttendees.slice(0, 2)
    : safeAttendees.slice(0, 3);

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

export default function EventCard({
  columnWidth,
  event,
  onOpen,
  onSavedChange,
  screen = "EventCard",
  source = "event_card",
}) {
  const pathname = usePathname();
  const saveScale = useRef(new Animated.Value(1)).current;
  const canSave = event.canSave === true;
  const [isSaved, setIsSaved] = useState(Boolean(canSave && event.isSaved));
  const resolvedColumnWidth = Number(columnWidth);
  const safeColumnWidth =
    Number.isFinite(resolvedColumnWidth) && resolvedColumnWidth > 0
      ? resolvedColumnWidth
      : 120;
  const thumbnailSource = getEventPreviewImage(event.thumbnailKey);
  const thumbnailHeight = getThumbnailHeight(thumbnailSource, safeColumnWidth);
  const formattedDate = formatEventCardDate(event.date);
  const title = String(event.title ?? "").toUpperCase();

  useEffect(() => {
    setIsSaved(Boolean(canSave && event.isSaved));
  }, [canSave, event.id, event.isSaved]);

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
    if (!canSave) return;

    const nextIsSaved = !isSaved;

    setIsSaved(nextIsSaved);
    animateSavePulse();
    Haptics.selectionAsync().catch(() => null);

    try {
      const updatedEvent = await toggleSavedEvent(event.id);
      setIsSaved(Boolean(updatedEvent?.canSave && updatedEvent?.isSaved));
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
    <View style={[styles.card, { width: safeColumnWidth }]}>
      <View style={[styles.imageWrap, { height: thumbnailHeight }]}>
        <Pressable
          accessibilityLabel={`Open details for ${event.title}`}
          accessibilityRole="button"
          onPress={handleOpenPress}
          style={StyleSheet.absoluteFill}
        >
          <Image
            accessibilityLabel={`${event.title} thumbnail`}
            resizeMode="cover"
            source={thumbnailSource}
            style={styles.thumbnail}
          />
        </Pressable>

        {canSave && (
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
                size={28}
                color={isSaved ? colors.primary : "rgba(255, 255, 255, 0.7)"}
              />
            </Animated.View>
          </Pressable>
        )}
      </View>

      <Pressable
        accessibilityLabel={`Open details for ${event.title}`}
        accessibilityRole="button"
        onPress={handleOpenPress}
        style={({ pressed }) => [styles.metaPressable, pressed && styles.pressed]}
      >
        <View style={styles.metaText}>
          <Text numberOfLines={1} style={styles.date}>
            {formattedDate}
          </Text>
          <Text numberOfLines={3} style={styles.title}>
            {title}
          </Text>
        </View>

        <VerticalAttendeeStack attendees={event.attendingFriends} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
  },
  imageWrap: {
    backgroundColor: colors.softSurface,
    borderCurve: "continuous",
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  thumbnail: {
    height: "100%",
    width: "100%",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 34,
    zIndex: 2,
  },
  metaPressable: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 6,
    minHeight: 48,
  },
  metaText: {
    flex: 1,
    minWidth: 0,
  },
  date: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0,
    lineHeight: 14,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 16,
    marginTop: 1,
  },
  avatarStack: {
    alignItems: "center",
    minHeight: 20,
    paddingTop: 1,
  },
  emptyStack: {
    minHeight: 20,
    width: 20,
  },
  avatar: {
    borderColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.2,
    height: 20,
    width: 20,
  },
  avatarOverlap: {
    marginTop: -6,
  },
  moreAvatar: {
    alignItems: "center",
    backgroundColor: colors.iconMuted,
    justifyContent: "center",
  },
  moreAvatarText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.72,
  },
});
