import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScreenStatusBar from "../components/ScreenStatusBar";
import { getEventById, joinEvent } from "../services/eventService";
import { logInteraction } from "../services/interactionLogService";
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

const friendAvatarKeys = {
  Ana: "ana",
  Clara: "clara",
  "Inês": "ines",
  "João": "joao",
  Miguel: "miguel",
  Rita: "rita",
};

const CTA_HEIGHT = 116;
const CTA_BOTTOM_GAP = 8;
const CTA_VERTICAL_PADDING = 14;
const SHEET_COLLAPSED_HEIGHT = 184;
const BACK_BUTTON_SIZE = 44;
const BACK_BUTTON_TOP_OFFSET = 12;
const SHEET_HANDLE_HEIGHT = 7;
const SHEET_HANDLE_TOP_PADDING = 10;
const SHEET_HANDLE_BOTTOM_PADDING = 18;
const DETAIL_DESCRIPTION =
  "Description of a very interesting event that will happen somewhere on the day of next month. All art enthusiasts are invited to this amazing annual event. The entry is free and we welcome you to stay as long as you want. Your only challenge will be that you won't want to leave.";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatDate(date) {
  if (!date) return "00/00/00";

  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;

  return `${day}/${month}/${year.slice(2)}`;
}

function Tag({ children }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{children}</Text>
    </View>
  );
}

function Avatar({ avatarKey, size = 34, style }) {
  return (
    <Image
      source={avatarImages[avatarKey] ?? avatarImages.ana}
      style={[
        styles.avatar,
        {
          borderRadius: size / 2,
          height: size,
          width: size,
        },
        style,
      ]}
    />
  );
}

function AvatarRow({ attendees, limit = 12, overlap = false }) {
  const safeAttendees = Array.isArray(attendees) ? attendees : [];
  const visibleAttendees = safeAttendees.slice(0, limit);

  if (visibleAttendees.length === 0) {
    return <Text style={styles.emptyText}>No friends attending yet.</Text>;
  }

  return (
    <View style={styles.avatarRow}>
      {visibleAttendees.map((friend, index) => (
        <Avatar
          avatarKey={friend.avatarKey}
          key={`${friend.id}-${index}`}
          size={34}
          style={overlap && index > 0 ? styles.overlappedAvatar : null}
        />
      ))}
    </View>
  );
}

function ExperienceRow({ names }) {
  const experiences = (Array.isArray(names) ? names : []).map((name, index) => ({
    id: `${name}-${index}`,
    avatarKey: friendAvatarKeys[name] ?? "ana",
  }));

  if (experiences.length === 0) {
    return <Text style={styles.emptyText}>No past experiences yet.</Text>;
  }

  return (
    <View style={styles.experienceRow}>
      {experiences.concat(experiences).slice(0, 10).map((friend, index) => (
        <Avatar
          avatarKey={friend.avatarKey}
          key={`${friend.id}-${index}`}
          size={34}
          style={index > 0 ? styles.overlappedAvatar : null}
        />
      ))}
      <View style={styles.moreCircle}>
        <Text style={styles.moreCircleText}>+</Text>
      </View>
    </View>
  );
}

function MapPreview() {
  return (
    <View style={styles.mapPreview}>
      <View style={[styles.mapRoad, styles.mapRoadOne]} />
      <View style={[styles.mapRoad, styles.mapRoadTwo]} />
      <View style={[styles.mapRoad, styles.mapRoadThree]} />
      <View style={[styles.mapRoad, styles.mapRoadFour]} />
      <Text style={[styles.mapLabel, styles.mapLabelOne]}>Campo de Ourique</Text>
      <Text style={[styles.mapLabel, styles.mapLabelTwo]}>Estrela</Text>
      <Text style={[styles.mapLabel, styles.mapLabelThree]}>Lisbon</Text>
      <Ionicons
        name="location"
        size={48}
        color={colors.primary}
        style={styles.mapPin}
      />
    </View>
  );
}

function RatingDots() {
  return (
    <View style={styles.ratingDots}>
      {[0, 1, 2, 3, 4].map((dot) => (
        <View
          key={dot}
          style={[styles.ratingDot, dot === 4 && styles.ratingDotMuted]}
        />
      ))}
    </View>
  );
}

function ReviewCard({ avatarKey }) {
  return (
    <View style={styles.reviewCard}>
      <Avatar avatarKey={avatarKey} size={34} />
      <Text numberOfLines={2} style={styles.reviewText}>
        Fake review that I wrote just for this
      </Text>
      <RatingDots />
    </View>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [event, setEvent] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const sheetY = useRef(new Animated.Value(0)).current;
  const currentSheetY = useRef(0);
  const sheetStartY = useRef(0);
  const scrollOffsetY = useRef(0);
  const scrollViewRef = useRef(null);

  const expandedY = 0;
  const ctaHeight = CTA_HEIGHT + CTA_BOTTOM_GAP;
  const collapsedY = Math.max(
    expandedY,
    height - ctaHeight - SHEET_COLLAPSED_HEIGHT,
  );
  const expandedTitleSpacer =
    BACK_BUTTON_TOP_OFFSET +
    BACK_BUTTON_SIZE +
    8 -
    (SHEET_HANDLE_TOP_PADDING + SHEET_HANDLE_HEIGHT + SHEET_HANDLE_BOTTOM_PADDING);
  const sheetHandleTopPadding = sheetY.interpolate({
    inputRange: [expandedY, collapsedY],
    outputRange: [
      insets.top + SHEET_HANDLE_TOP_PADDING,
      SHEET_HANDLE_TOP_PADDING,
    ],
    extrapolate: "clamp",
  });
  const titleTopSpacer = sheetY.interpolate({
    inputRange: [expandedY, collapsedY],
    outputRange: [expandedTitleSpacer, 6],
    extrapolate: "clamp",
  });

  const resetScrollToTop = useCallback(() => {
    scrollOffsetY.current = 0;
    scrollViewRef.current?.scrollTo?.({ animated: false, y: 0 });
  }, []);

  const animateSheetTo = useCallback(
    (destination) => {
      const willExpand = destination === expandedY;

      if (!willExpand) {
        resetScrollToTop();
      }

      setIsSheetExpanded(willExpand);
      Animated.spring(sheetY, {
        damping: 25,
        mass: 0.75,
        stiffness: 210,
        toValue: destination,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && !willExpand) {
          resetScrollToTop();
        }
      });
    },
    [expandedY, resetScrollToTop, sheetY],
  );

  const handlePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          sheetStartY.current = currentSheetY.current;
        },
        onPanResponderMove: (_, gestureState) => {
          sheetY.setValue(
            clamp(sheetStartY.current + gestureState.dy, expandedY, collapsedY),
          );
        },
        onPanResponderRelease: (_, gestureState) => {
          const midpoint = (expandedY + collapsedY) / 2;
          const shouldExpand =
            gestureState.vy < -0.35 || currentSheetY.current < midpoint;

          animateSheetTo(shouldExpand ? expandedY : collapsedY);
        },
      }),
    [animateSheetTo, collapsedY, expandedY, sheetY],
  );

  const sheetExpansionResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          !isSheetExpanded &&
          gestureState.dy < -8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          sheetStartY.current = currentSheetY.current;
        },
        onPanResponderMove: (_, gestureState) => {
          sheetY.setValue(
            clamp(sheetStartY.current + gestureState.dy, expandedY, collapsedY),
          );
        },
        onPanResponderRelease: (_, gestureState) => {
          const midpoint = (expandedY + collapsedY) / 2;
          const shouldExpand =
            gestureState.vy < -0.35 || currentSheetY.current < midpoint;

          animateSheetTo(shouldExpand ? expandedY : collapsedY);
        },
        onPanResponderTerminate: () => {
          animateSheetTo(collapsedY);
        },
      }),
    [
      animateSheetTo,
      collapsedY,
      expandedY,
      isSheetExpanded,
      sheetY,
    ],
  );

  const scrollCollapseResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          isSheetExpanded &&
          scrollOffsetY.current <= 0 &&
          gestureState.dy > 10 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          sheetY.setValue(clamp(gestureState.dy, expandedY, collapsedY));
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldCollapse = gestureState.dy > 42 || gestureState.vy > 0.35;
          animateSheetTo(shouldCollapse ? collapsedY : expandedY);
        },
        onPanResponderTerminate: () => {
          animateSheetTo(expandedY);
        },
      }),
    [animateSheetTo, collapsedY, expandedY, isSheetExpanded, sheetY],
  );

  useEffect(() => {
    const listenerId = sheetY.addListener(({ value }) => {
      currentSheetY.current = value;
    });

    return () => sheetY.removeListener(listenerId);
  }, [sheetY]);

  useEffect(() => {
    sheetY.setValue(collapsedY);
    currentSheetY.current = collapsedY;
    resetScrollToTop();
    setIsSheetExpanded(false);
  }, [collapsedY, resetScrollToTop, sheetY]);

  useEffect(() => {
    if (!eventId) return;

    async function loadEvent() {
      const selectedEvent = await getEventById(eventId);
      setEvent(selectedEvent);
      setIsSaved(Boolean(selectedEvent?.isSaved));

      await logInteraction("event_detail_opened", {
        eventId,
        screen: "EventDetailScreen",
      });
    }

    loadEvent();
  }, [eventId]);

  async function handleJoin() {
    if (!event) return;

    const updatedEvent = await joinEvent(event.id);
    setEvent(updatedEvent);

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await logInteraction("participation_confirmed", {
      eventId: event.id,
      screen: "EventDetailScreen",
    });
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <ScreenStatusBar variant="lightBackground" />
        <Text>Evento não encontrado ou a carregar...</Text>
      </View>
    );
  }

  const imageSource =
    thumbnailImages[event.thumbnailKey] ?? thumbnailImages["art-gallery"];
  const price = event.price?.toUpperCase?.() ?? "FREE";
  const timeRange = event.time ? `${event.time} - 00:00` : "00:00 - 00:00";
  const statusBarVariant = isSheetExpanded ? "lightBackground" : "image";

  return (
    <View style={styles.container}>
      <Image source={imageSource} style={styles.heroImage} />
      <ScreenStatusBar
        variant={statusBarVariant}
        withImageOverlay={!isSheetExpanded}
      />

      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={() => router.back()}
        style={[styles.backButton, { top: insets.top + BACK_BUTTON_TOP_OFFSET }]}
      >
        <Ionicons name="chevron-back" size={24} color={colors.iconMuted} />
      </Pressable>

      <Animated.View
        {...sheetExpansionResponder.panHandlers}
        style={[
          styles.sheet,
          {
            transform: [{ translateY: sheetY }],
          },
        ]}
      >
        <View {...handlePanResponder.panHandlers} style={styles.sheetGrabArea}>
          <Animated.View
            style={[
              styles.sheetGrabAreaInner,
              { paddingTop: sheetHandleTopPadding },
            ]}
          >
            <View style={styles.sheetHandle} />
          </Animated.View>
        </View>

        <View style={styles.sheetScrollArea} {...scrollCollapseResponder.panHandlers}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[
              styles.sheetContent,
              {
                paddingBottom: ctaHeight + 12,
              },
            ]}
            onScroll={(event) => {
              scrollOffsetY.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEnabled={isSheetExpanded}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ height: titleTopSpacer }} />
            <View style={styles.titleRow}>
              <Text style={styles.title}>{event.title}</Text>
              <Pressable
                accessibilityLabel={
                  isSaved ? "Remove saved event" : "Save event"
                }
                accessibilityRole="button"
                accessibilityState={{ selected: isSaved }}
                hitSlop={8}
                onPress={() => setIsSaved((currentValue) => !currentValue)}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="bookmark"
                  size={28}
                  color={isSaved ? colors.primary : colors.iconMuted}
                />
              </Pressable>
            </View>

            <View style={styles.tagsRow}>
              <Tag>{formatDate(event.date)}</Tag>
              <Tag>{timeRange}</Tag>
              <Tag>{event.category?.toUpperCase?.() ?? "EVENT"}</Tag>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>
                {event.longDescription ?? DETAIL_DESCRIPTION}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <Text style={styles.locationText}>{event.locationName}</Text>
              <MapPreview />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Friends</Text>
              <Text style={styles.eyebrow}>ATTENDING</Text>
              <AvatarRow attendees={event.attendingFriends} />
              <Text style={styles.eyebrow}>YOUR FRIENDS EXPERIENCES HERE</Text>
              <ExperienceRow names={event.friendsWentBefore} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <View style={styles.reviewsPanel}>
                <ReviewCard avatarKey="ana" />
                <ReviewCard avatarKey="miguel" />
              </View>
            </View>
          </ScrollView>
        </View>
      </Animated.View>

      <View
        style={[
          styles.ctaBar,
          {
            bottom: CTA_BOTTOM_GAP,
          },
        ]}
      >
        <Text style={styles.ctaPrice}>{price}</Text>
        <Pressable
          accessibilityLabel={event.isJoined ? "Already going" : "Join event"}
          accessibilityRole="button"
          onPress={handleJoin}
          style={({ pressed }) => [styles.ctaButton, pressed && styles.pressed]}
        >
          <Text style={styles.ctaButtonText}>
            {event.isJoined ? "Going" : "I'm Going"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  heroImage: {
    height: "66%",
    left: 0,
    position: "absolute",
    resizeMode: "cover",
    right: 0,
    top: 0,
    width: "100%",
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderRadius: 22,
    height: BACK_BUTTON_SIZE,
    justifyContent: "center",
    left: 16,
    position: "absolute",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    width: BACK_BUTTON_SIZE,
    zIndex: 10,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    bottom: 0,
    elevation: 10,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    top: 0,
    zIndex: 5,
  },
  sheetGrabArea: {
    alignItems: "stretch",
  },
  sheetGrabAreaInner: {
    alignItems: "center",
    paddingBottom: SHEET_HANDLE_BOTTOM_PADDING,
  },
  sheetHandle: {
    backgroundColor: colors.iconMuted,
    borderRadius: 4,
    height: SHEET_HANDLE_HEIGHT,
    opacity: 0.75,
    width: 110,
  },
  sheetContent: {
    paddingHorizontal: 24,
  },
  sheetScrollArea: {
    flex: 1,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
  },
  title: {
    color: "#2E2E2E",
    flex: 1,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 30,
  },
  saveButton: {
    alignItems: "center",
    borderRadius: 16,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  tag: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tagText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: "#2E2E2E",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  description: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 23,
  },
  locationText: {
    color: colors.mutedText,
    fontSize: 15,
    marginBottom: 12,
  },
  mapPreview: {
    backgroundColor: "#DDE1E1",
    borderRadius: 10,
    height: 180,
    overflow: "hidden",
  },
  mapRoad: {
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    borderRadius: 3,
    height: 5,
    position: "absolute",
    width: 280,
  },
  mapRoadOne: {
    left: -26,
    top: 48,
    transform: [{ rotate: "-22deg" }],
  },
  mapRoadTwo: {
    right: -30,
    top: 94,
    transform: [{ rotate: "18deg" }],
  },
  mapRoadThree: {
    left: 24,
    top: 132,
    transform: [{ rotate: "-6deg" }],
  },
  mapRoadFour: {
    left: 84,
    top: 22,
    transform: [{ rotate: "74deg" }],
  },
  mapLabel: {
    color: "#8B9294",
    fontSize: 8,
    fontWeight: "700",
    position: "absolute",
  },
  mapLabelOne: {
    left: 30,
    top: 85,
  },
  mapLabelTwo: {
    left: 118,
    top: 128,
  },
  mapLabelThree: {
    bottom: 18,
    fontSize: 12,
    right: 16,
  },
  mapPin: {
    left: "48%",
    marginLeft: -24,
    marginTop: -24,
    position: "absolute",
    top: "53%",
  },
  eyebrow: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 12,
    marginTop: 2,
  },
  avatarRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 11,
    marginBottom: 14,
  },
  experienceRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 2,
  },
  avatar: {
    backgroundColor: colors.border,
  },
  overlappedAvatar: {
    marginLeft: -14,
  },
  moreCircle: {
    alignItems: "center",
    backgroundColor: colors.iconMuted,
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    marginLeft: -12,
    width: 38,
  },
  moreCircleText: {
    color: colors.surface,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 32,
  },
  emptyText: {
    color: colors.mutedText,
    fontSize: 13,
    marginBottom: 14,
  },
  reviewsPanel: {
    backgroundColor: "#EFEFEF",
    borderRadius: 14,
    gap: 12,
    padding: 14,
  },
  reviewCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    flexDirection: "row",
    minHeight: 54,
    paddingHorizontal: 12,
  },
  reviewText: {
    color: colors.mutedText,
    flex: 1,
    fontSize: 13,
    lineHeight: 16,
    marginHorizontal: 12,
  },
  ratingDots: {
    flexDirection: "row",
    gap: 4,
  },
  ratingDot: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  ratingDotMuted: {
    backgroundColor: colors.iconMuted,
  },
  ctaBar: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    elevation: 12,
    left: 10,
    paddingHorizontal: 18,
    paddingVertical: CTA_VERTICAL_PADDING,
    position: "absolute",
    right: 10,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: -7,
    },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    zIndex: 20,
  },
  ctaPrice: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  ctaButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    minHeight: 52,
    justifyContent: "center",
  },
  ctaButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.72,
  },
});
