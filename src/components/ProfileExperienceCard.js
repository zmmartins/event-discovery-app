import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePathname } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { formatAttendedExperienceDate } from "../domain/events/eventFormatters";
import { toggleSavedEvent } from "../services/eventService";
import { LOG_ACTIONS, logInteraction } from "../services/interactionLogService";
import { colors } from "../theme/colors";
import { getAvatarImage, getEventPreviewImage } from "../utils/imageAssets";

const PHOTO_FRAME_WIDTH = 128;
const PHOTO_FRAME_HEIGHT = 228;
const PHOTO_ITEM_WIDTH = 104;
const PHOTO_LOOP_REPEATS = 5;
const PHOTO_LOOP_MIDDLE_INDEX = Math.floor(PHOTO_LOOP_REPEATS / 2);

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

function ProfilePhotoCarousel({ eventTitle, photoRefs }) {
  const carouselRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [carouselWidth, setCarouselWidth] = useState(PHOTO_FRAME_WIDTH);
  const safePhotoRefs = useMemo(
    () => (Array.isArray(photoRefs) ? photoRefs.filter(Boolean) : []),
    [photoRefs]
  );
  const shouldLoop = safePhotoRefs.length > 1;
  const loopStartIndex = shouldLoop ? safePhotoRefs.length * PHOTO_LOOP_MIDDLE_INDEX : 0;
  const photoRefsKey = useMemo(
    () => safePhotoRefs.map((photoRef) => photoRef.id ?? photoRef.imageKey).join("|"),
    [safePhotoRefs]
  );
  const carouselPhotoRefs = useMemo(() => {
    if (!shouldLoop) return safePhotoRefs;

    return Array.from({ length: PHOTO_LOOP_REPEATS }, () => safePhotoRefs).flat();
  }, [safePhotoRefs, shouldLoop]);
  const carouselSidePadding = Math.max((carouselWidth - PHOTO_ITEM_WIDTH) / 2, 0);

  useEffect(() => {
    const initialOffset = loopStartIndex * PHOTO_ITEM_WIDTH;

    const frame = requestAnimationFrame(() => {
      carouselRef.current?.scrollToOffset({
        animated: false,
        offset: initialOffset,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [loopStartIndex, photoRefsKey]);

  const getIndexFromOffset = useCallback(
    (offsetX) => Math.round(offsetX / PHOTO_ITEM_WIDTH),
    []
  );

  const handleCarouselLayout = useCallback((event) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);

    if (nextWidth <= 0) return;
    setCarouselWidth((currentWidth) =>
      currentWidth === nextWidth ? currentWidth : nextWidth
    );
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event) => {
      const rawIndex = getIndexFromOffset(event.nativeEvent.contentOffset.x);

      if (!shouldLoop) {
        return;
      }

      const photoIndex =
        ((rawIndex % safePhotoRefs.length) + safePhotoRefs.length) % safePhotoRefs.length;
      const firstSafeIndex = safePhotoRefs.length;
      const lastSafeIndex = safePhotoRefs.length * (PHOTO_LOOP_REPEATS - 1);

      if (rawIndex >= firstSafeIndex && rawIndex < lastSafeIndex) {
        return;
      }

      const nextIndex = safePhotoRefs.length * PHOTO_LOOP_MIDDLE_INDEX + photoIndex;
      const nextOffset = nextIndex * PHOTO_ITEM_WIDTH;

      carouselRef.current?.scrollToOffset({
        animated: false,
        offset: nextOffset,
      });
    },
    [getIndexFromOffset, safePhotoRefs.length, shouldLoop]
  );

  const renderPhoto = useCallback(
    ({ item: photoRef, index }) => {
      const itemOffset = index * PHOTO_ITEM_WIDTH;
      const inputRange = [
        itemOffset - PHOTO_ITEM_WIDTH,
        itemOffset,
        itemOffset + PHOTO_ITEM_WIDTH,
      ];
      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.82, 1, 0.82],
        extrapolate: "clamp",
      });
      const translateY = scrollX.interpolate({
        inputRange,
        outputRange: [18, 0, 18],
        extrapolate: "clamp",
      });

      return (
        <Animated.View
          style={[
            styles.carouselItem,
            {
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          <Image
            accessibilityLabel={`${eventTitle} memory`}
            resizeMode="cover"
            source={getEventPreviewImage(photoRef.imageKey)}
            style={styles.carouselImage}
          />
        </Animated.View>
      );
    },
    [eventTitle, scrollX]
  );

  if (safePhotoRefs.length === 0) return null;

  return (
    <View onLayout={handleCarouselLayout} style={styles.photoCarouselViewport}>
      <Animated.FlatList
        bounces={false}
        contentContainerStyle={[
          styles.photoCarouselContent,
          { paddingHorizontal: carouselSidePadding },
        ]}
        data={carouselPhotoRefs}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          index,
          length: PHOTO_ITEM_WIDTH,
          offset: PHOTO_ITEM_WIDTH * index,
        })}
        horizontal
        initialScrollIndex={loopStartIndex}
        keyExtractor={(photoRef, index) => `${photoRef.id ?? photoRef.imageKey}-${index}`}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
        })}
        onScrollToIndexFailed={({ index }) => {
          carouselRef.current?.scrollToOffset({
            animated: false,
            offset: index * PHOTO_ITEM_WIDTH,
          });
        }}
        ref={carouselRef}
        removeClippedSubviews={false}
        renderItem={renderPhoto}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={PHOTO_ITEM_WIDTH}
        style={styles.photoCarousel}
      />
    </View>
  );
}

export default function ProfileExperienceCard({
  event,
  experience,
  onOpen,
  onSavedChange,
  screen = "ProfileScreen",
  source = "profile_attended_list",
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
    <View style={styles.experience}>
      <ProfilePhotoCarousel eventTitle={event.title} photoRefs={experience.photoRefs} />

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
            <Text style={styles.date}>
              {formatAttendedExperienceDate(experience.attendedAt)}
            </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  experience: {
    gap: 8,
  },
  photoCarouselViewport: {
    height: PHOTO_FRAME_HEIGHT + 28,
    overflow: "visible",
  },
  photoCarousel: {
    overflow: "visible",
  },
  photoCarouselContent: {
    alignItems: "center",
    minHeight: PHOTO_FRAME_HEIGHT + 28,
    overflow: "visible",
    paddingVertical: 14,
  },
  carouselItem: {
    alignItems: "center",
    height: PHOTO_FRAME_HEIGHT,
    justifyContent: "center",
    overflow: "visible",
    width: PHOTO_ITEM_WIDTH,
  },
  carouselImage: {
    backgroundColor: colors.effects.surfaceOverlay,
    borderColor: colors.effects.surfaceStrongBorder,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: PHOTO_FRAME_HEIGHT,
    width: PHOTO_FRAME_WIDTH,
  },
  card: {
    backgroundColor: colors.effects.surfaceRaised,
    borderColor: colors.effects.surfaceStrongBorder,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    minHeight: 128,
    padding: 16,
    shadowColor: colors.effects.shadow,
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
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 20,
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
    color: colors.secondaryText,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
  },
  footerRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
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
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 72,
    paddingHorizontal: 8,
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
