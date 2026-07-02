import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useFocusEffect,
  useLocalSearchParams,
  usePathname,
  useRouter,
} from "expo-router";
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
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScreenStatusBar from "../components/ScreenStatusBar";
import { formatShortEventDate } from "../domain/events/eventFormatters";
import {
  cancelEventParticipation,
  getEventById,
  joinEvent,
  toggleSavedEvent,
} from "../services/eventService";
import { LOG_ACTIONS, logInteraction } from "../services/interactionLogService";
import { getForegroundUserLocation } from "../services/locationService";
import { colors } from "../theme/colors";
import { APP_MAP_STYLE } from "../theme/mapStyle";
import { getAvatarImage, getEventDetailImage } from "../utils/imageAssets";

const friendAvatarKeys = {
  Ana: "ana",
  Clara: "clara",
  Inês: "ines",
  João: "joao",
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
const HERO_IMAGE_HEIGHT_RATIO = 0.66;
const HERO_IMAGE_DASH_WIDTH = 8;
const HERO_IMAGE_ACTIVE_DASH_WIDTH = 22;
const HERO_IMAGE_DASH_HEIGHT = 4;
const HERO_IMAGE_DASH_GAP = 9;
const HERO_IMAGE_DASH_HIT_HEIGHT = 22;
const HERO_IMAGE_DASH_RAIL_WIDTH = 56;
const HERO_IMAGE_DASH_RIGHT_OFFSET = 14;
const MINI_MAP_HEIGHT = 190;
const MINI_MAP_LATITUDE_DELTA = 0.012;
const MINI_MAP_LONGITUDE_DELTA = 0.012;
const MINI_MAP_MIN_SAFE_DELTA = 0.000001;
const MINI_MAP_MAX_LATITUDE_DELTA = 170;
const MINI_MAP_MAX_LONGITUDE_DELTA = 360;
const MINI_MAP_MIN_LATITUDE = -85;
const MINI_MAP_MAX_LATITUDE = 85;
const MINI_MAP_RECENTER_DURATION_MS = 420;
const MINI_MAP_CENTER_TOLERANCE_METERS = 40;
const MINI_MAP_BUTTON_SIZE = 42;
const DETAIL_DESCRIPTION =
  "Prototype event description pending final organizer copy. This space is reserved for the event story, schedule notes, and practical details.";

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTouchCount(nativeEvent, gestureState) {
  return gestureState?.numberActiveTouches ?? nativeEvent?.touches?.length ?? 0;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function getCoordinateDistanceMeters(firstCoordinate, secondCoordinate) {
  if (!firstCoordinate || !secondCoordinate) return Number.POSITIVE_INFINITY;

  const earthRadiusMeters = 6371000;
  const latitudeDelta = toRadians(secondCoordinate.latitude - firstCoordinate.latitude);
  const longitudeDelta = toRadians(
    secondCoordinate.longitude - firstCoordinate.longitude
  );
  const firstLatitude = toRadians(firstCoordinate.latitude);
  const secondLatitude = toRadians(secondCoordinate.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function isValidCoordinate(coordinate) {
  return (
    Number.isFinite(coordinate?.latitude) &&
    Number.isFinite(coordinate?.longitude)
  );
}

function getEventLocationCoordinate(event) {
  const coordinate = {
    latitude: event?.latitude,
    longitude: event?.longitude,
  };

  return isValidCoordinate(coordinate) ? coordinate : null;
}

function getMiniMapRegion(coordinate) {
  return {
    latitude: coordinate.latitude,
    latitudeDelta: MINI_MAP_LATITUDE_DELTA,
    longitude: coordinate.longitude,
    longitudeDelta: MINI_MAP_LONGITUDE_DELTA,
  };
}

function normalizeLongitude(longitude) {
  if (!Number.isFinite(longitude)) return 0;

  let nextLongitude = longitude;

  while (nextLongitude > 180) nextLongitude -= 360;
  while (nextLongitude < -180) nextLongitude += 360;

  return nextLongitude;
}

function getSafeLatitudeDelta(latitudeDelta) {
  if (!Number.isFinite(latitudeDelta)) return MINI_MAP_LATITUDE_DELTA;

  return clamp(
    Math.abs(latitudeDelta),
    MINI_MAP_MIN_SAFE_DELTA,
    MINI_MAP_MAX_LATITUDE_DELTA
  );
}

function getSafeLongitudeDelta(longitudeDelta) {
  if (!Number.isFinite(longitudeDelta)) return MINI_MAP_LONGITUDE_DELTA;

  return clamp(
    Math.abs(longitudeDelta),
    MINI_MAP_MIN_SAFE_DELTA,
    MINI_MAP_MAX_LONGITUDE_DELTA
  );
}

function clampMiniMapRegion(region) {
  if (!region) return region;

  return {
    latitude: clamp(region.latitude, MINI_MAP_MIN_LATITUDE, MINI_MAP_MAX_LATITUDE),
    latitudeDelta: getSafeLatitudeDelta(region.latitudeDelta),
    longitude: normalizeLongitude(region.longitude),
    longitudeDelta: getSafeLongitudeDelta(region.longitudeDelta),
  };
}

function getTouchPoint(touch) {
  return {
    x: Number.isFinite(touch?.pageX) ? touch.pageX : touch?.locationX ?? 0,
    y: Number.isFinite(touch?.pageY) ? touch.pageY : touch?.locationY ?? 0,
  };
}

function getTwoFingerTouchGesture(nativeEvent) {
  const touches = nativeEvent?.touches ?? [];

  if (touches.length < 2) return null;

  const firstPoint = getTouchPoint(touches[0]);
  const secondPoint = getTouchPoint(touches[1]);
  const dx = secondPoint.x - firstPoint.x;
  const dy = secondPoint.y - firstPoint.y;

  return {
    centroid: {
      x: (firstPoint.x + secondPoint.x) / 2,
      y: (firstPoint.y + secondPoint.y) / 2,
    },
    distance: Math.max(Math.hypot(dx, dy), 1),
  };
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
      source={getAvatarImage(avatarKey)}
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
      {experiences
        .concat(experiences)
        .slice(0, 10)
        .map((friend, index) => (
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

function EventLocationPin() {
  return (
    <View pointerEvents="none" style={styles.eventLocationPin}>
      <View style={styles.eventLocationPinHead}>
        <Ionicons name="location" size={20} color={colors.text} />
      </View>
      <View style={styles.eventLocationPinTip} />
    </View>
  );
}

function UserLocationDot() {
  return (
    <View pointerEvents="none" style={styles.miniUserLocationMarker}>
      <View style={styles.miniUserLocationPulse} />
      <View style={styles.miniUserLocationRing}>
        <View style={styles.miniUserLocationDot} />
      </View>
    </View>
  );
}

function EventMiniMap({
  event,
  onInteractionChange,
  onMiniMapTouchActiveChange,
  onOneFingerContentGestureEnd,
  onOneFingerContentGestureMove,
  onOneFingerContentGestureStart,
}) {
  const pathname = usePathname();
  const mapRef = useRef(null);
  const eventCoordinate = useMemo(() => getEventLocationCoordinate(event), [event]);
  const [userCoordinate, setUserCoordinate] = useState(null);
  const [isCenteredOnEvent, setIsCenteredOnEvent] = useState(true);
  const [miniMapRegion, setMiniMapRegion] = useState(null);
  const miniMapRegionRef = useRef(null);
  const miniMapSizeRef = useRef({
    height: MINI_MAP_HEIGHT,
    width: 1,
  });
  const twoFingerGestureStartRef = useRef(null);
  const isTwoFingerGestureActiveRef = useRef(false);
  const isOneFingerContentGestureActiveRef = useRef(false);

  const initialRegion = useMemo(() => {
    if (!eventCoordinate) return null;

    return getMiniMapRegion(eventCoordinate);
  }, [eventCoordinate]);

  useEffect(() => {
    if (!initialRegion) return;

    const nextRegion = clampMiniMapRegion(initialRegion);

    miniMapRegionRef.current = nextRegion;
    setMiniMapRegion(nextRegion);
    setIsCenteredOnEvent(true);
  }, [initialRegion]);

  useEffect(() => {
    let isActive = true;

    getForegroundUserLocation({
      route: pathname,
      screen: "EventDetailScreen",
      source: "event_detail_mini_map",
    }).then((result) => {
      if (!isActive) return;

      if (result.status === "available" && isValidCoordinate(result.coordinate)) {
        setUserCoordinate(result.coordinate);
      }
    });

    return () => {
      isActive = false;
    };
  }, [pathname]);

  const updateCenteredOnEventState = useCallback(
    (region) => {
      if (!eventCoordinate) return;

      const distanceFromEvent = getCoordinateDistanceMeters(
        {
          latitude: region.latitude,
          longitude: region.longitude,
        },
        eventCoordinate
      );

      setIsCenteredOnEvent(distanceFromEvent <= MINI_MAP_CENTER_TOLERANCE_METERS);
    },
    [eventCoordinate]
  );

  const commitMiniMapRegion = useCallback(
    (region) => {
      const nextRegion = clampMiniMapRegion(region);

      miniMapRegionRef.current = nextRegion;
      setMiniMapRegion(nextRegion);
      updateCenteredOnEventState(nextRegion);
    },
    [updateCenteredOnEventState]
  );

  const centerOnEvent = useCallback(() => {
    if (!eventCoordinate) return;

    const nextRegion = clampMiniMapRegion(getMiniMapRegion(eventCoordinate));

    Haptics.selectionAsync().catch(() => null);
    miniMapRegionRef.current = nextRegion;
    setMiniMapRegion(nextRegion);
    setIsCenteredOnEvent(true);

    mapRef.current?.animateToRegion?.(nextRegion, MINI_MAP_RECENTER_DURATION_MS);
  }, [eventCoordinate]);

  const handleRegionChange = useCallback(
    (region) => {
      updateCenteredOnEventState(region);
    },
    [updateCenteredOnEventState]
  );

  const handleRegionChangeComplete = useCallback(
    (region) => {
      updateCenteredOnEventState(region);
    },
    [updateCenteredOnEventState]
  );

  const beginTwoFingerMapGesture = useCallback(
    (nativeEvent) => {
      const touchGesture = getTwoFingerTouchGesture(nativeEvent);
      const currentRegion = miniMapRegionRef.current;

      if (!touchGesture || !currentRegion) return false;

      isTwoFingerGestureActiveRef.current = true;
      isOneFingerContentGestureActiveRef.current = false;
      twoFingerGestureStartRef.current = {
        region: currentRegion,
        touchGesture,
      };

      onInteractionChange?.(true);

      return true;
    },
    [onInteractionChange]
  );

  const updateTwoFingerMapGesture = useCallback(
    (nativeEvent) => {
      const currentTouchGesture = getTwoFingerTouchGesture(nativeEvent);
      const gestureStart = twoFingerGestureStartRef.current;

      if (!currentTouchGesture || !gestureStart) return;

      const mapSize = miniMapSizeRef.current;
      const mapWidth = Math.max(mapSize.width, 1);
      const mapHeight = Math.max(mapSize.height, 1);
      const startRegion = gestureStart.region;
      const startTouchGesture = gestureStart.touchGesture;

      const zoomScale = startTouchGesture.distance / currentTouchGesture.distance;
      const nextLatitudeDelta = getSafeLatitudeDelta(
        startRegion.latitudeDelta * zoomScale
      );
      const nextLongitudeDelta = getSafeLongitudeDelta(
        startRegion.longitudeDelta * zoomScale
      );

      const centroidDx =
        currentTouchGesture.centroid.x - startTouchGesture.centroid.x;
      const centroidDy =
        currentTouchGesture.centroid.y - startTouchGesture.centroid.y;

      const nextRegion = {
        latitude: startRegion.latitude + (centroidDy / mapHeight) * nextLatitudeDelta,
        latitudeDelta: nextLatitudeDelta,
        longitude:
          startRegion.longitude - (centroidDx / mapWidth) * nextLongitudeDelta,
        longitudeDelta: nextLongitudeDelta,
      };

      commitMiniMapRegion(nextRegion);
    },
    [commitMiniMapRegion]
  );

  const endMiniMapGesture = useCallback(
    (gestureState) => {
      const wasOneFingerContentGesture = isOneFingerContentGestureActiveRef.current;

      isTwoFingerGestureActiveRef.current = false;
      isOneFingerContentGestureActiveRef.current = false;
      twoFingerGestureStartRef.current = null;

      onInteractionChange?.(false);
      onMiniMapTouchActiveChange?.(false);

      if (wasOneFingerContentGesture) {
        onOneFingerContentGestureEnd?.(gestureState);
      }
    },
    [
      onInteractionChange,
      onMiniMapTouchActiveChange,
      onOneFingerContentGestureEnd,
    ]
  );

  const miniMapGestureResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,

        onPanResponderGrant: (responderEvent, gestureState) => {
          onMiniMapTouchActiveChange?.(true);

          const touchCount = getTouchCount(responderEvent.nativeEvent, gestureState);

          if (touchCount >= 2) {
            beginTwoFingerMapGesture(responderEvent.nativeEvent);
            return;
          }

          isTwoFingerGestureActiveRef.current = false;
          isOneFingerContentGestureActiveRef.current = true;
          twoFingerGestureStartRef.current = null;

          onInteractionChange?.(false);
          onOneFingerContentGestureStart?.();
        },

        onPanResponderMove: (responderEvent, gestureState) => {
          const touchCount = getTouchCount(responderEvent.nativeEvent, gestureState);

          if (touchCount >= 2) {
            if (!isTwoFingerGestureActiveRef.current) {
              beginTwoFingerMapGesture(responderEvent.nativeEvent);
            }

            updateTwoFingerMapGesture(responderEvent.nativeEvent);
            return;
          }

          if (isTwoFingerGestureActiveRef.current) {
            return;
          }

          if (!isOneFingerContentGestureActiveRef.current) {
            isOneFingerContentGestureActiveRef.current = true;
            onOneFingerContentGestureStart?.();
          }

          onOneFingerContentGestureMove?.(gestureState);
        },

        onPanResponderRelease: (_, gestureState) => {
          endMiniMapGesture(gestureState);
        },

        onPanResponderTerminate: (_, gestureState) => {
          endMiniMapGesture(gestureState);
        },

        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [
      beginTwoFingerMapGesture,
      endMiniMapGesture,
      onInteractionChange,
      onMiniMapTouchActiveChange,
      onOneFingerContentGestureMove,
      onOneFingerContentGestureStart,
      updateTwoFingerMapGesture,
    ]
  );

  if (!eventCoordinate || !initialRegion) {
    return (
      <View style={[styles.mapPreview, styles.mapUnavailable]}>
        <Ionicons name="map-outline" size={24} color={colors.iconMuted} />
        <Text style={styles.mapUnavailableText}>Location map unavailable</Text>
      </View>
    );
  }

  const isRecenterButtonActive = isCenteredOnEvent;

  return (
    <View style={styles.mapPreview}>
      <View
        onLayout={(layoutEvent) => {
          const { height, width } = layoutEvent.nativeEvent.layout;

          miniMapSizeRef.current = {
            height: Math.max(height, 1),
            width: Math.max(width, 1),
          };
        }}
        style={styles.miniMapGestureGate}
        {...miniMapGestureResponder.panHandlers}
      >
        <MapView
          customMapStyle={APP_MAP_STYLE}
          loadingBackgroundColor={colors.softSurface}
          loadingEnabled
          loadingIndicatorColor={colors.primary}
          mapType="standard"
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
          pitchEnabled={false}
          provider={PROVIDER_GOOGLE}
          ref={mapRef}
          region={miniMapRegion ?? initialRegion}
          rotateEnabled={false}
          scrollEnabled={false}
          showsBuildings={false}
          showsCompass={false}
          showsIndoors={false}
          showsMyLocationButton={false}
          showsPointsOfInterest={false}
          showsScale={false}
          showsTraffic={false}
          style={styles.miniMap}
          toolbarEnabled={false}
          zoomEnabled={false}
          zoomTapEnabled={false}
        >
          <Marker
            anchor={{ x: 0.5, y: 1 }}
            coordinate={eventCoordinate}
            tracksViewChanges={false}
          >
            <EventLocationPin />
          </Marker>

          {userCoordinate && (
            <Marker
              anchor={{ x: 0.5, y: 0.5 }}
              coordinate={userCoordinate}
              tracksViewChanges={false}
            >
              <UserLocationDot />
            </Marker>
          )}
        </MapView>
      </View>

      <Pressable
        accessibilityLabel="Center map on event location"
        accessibilityRole="button"
        accessibilityState={{ selected: isCenteredOnEvent }}
        onPress={centerOnEvent}
        style={({ pressed }) => [
          styles.mapRecenterButton,
          isRecenterButtonActive
            ? styles.mapRecenterButtonActive
            : styles.mapRecenterButtonInactive,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          name="locate"
          size={20}
          color={isRecenterButtonActive ? colors.text : colors.iconMuted}
        />
      </Pressable>
    </View>
  );
}

function RatingDots() {
  return (
    <View style={styles.ratingDots}>
      {[0, 1, 2, 3, 4].map((dot) => (
        <View key={dot} style={[styles.ratingDot, dot === 4 && styles.ratingDotMuted]} />
      ))}
    </View>
  );
}

function getTimePart(dateTime) {
  return typeof dateTime === "string" && dateTime.length >= 16
    ? dateTime.slice(11, 16)
    : "";
}

function getEventTimeRange(event) {
  const startTime = event.time || getTimePart(event.startsAt);
  const endTime = getTimePart(event.endsAt);

  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return startTime;

  return "Time TBA";
}

function ReviewCard({ avatarKey }) {
  return (
    <View style={styles.reviewCard}>
      <Avatar avatarKey={avatarKey} size={34} />
      <Text numberOfLines={2} style={styles.reviewText}>
        Prototype review placeholder for usability testing.
      </Text>
      <RatingDots />
    </View>
  );
}

function getJoinButtonLabel(event) {
  if (event.isJoined) return "Going";

  if (event.availability === "sold_out") return "Sold Out";
  if (event.availability === "canceled") return "Canceled";
  if (event.availability === "already_happened") return "Past Event";

  return "I'm Going";
}

function getEventHeroImageKeys(event) {
  const imageKeys = Array.isArray(event?.imageKeys)
    ? event.imageKeys.filter(Boolean)
    : [];

  if (imageKeys.length > 0) {
    return imageKeys;
  }

  return event?.thumbnailKey ? [event.thumbnailKey] : [];
}

function getClampedImageIndex(index, imageCount) {
  if (imageCount <= 0) return 0;

  return clamp(index, 0, imageCount - 1);
}

function EventHeroImageGallery({
  activeIndex,
  imageKeys,
  onSelectIndex,
  topInset = 0,
}) {
  const railRef = useRef(null);
  const railLayoutRef = useRef({
    height: 1,
    pageY: 0,
    width: HERO_IMAGE_DASH_RAIL_WIDTH,
  });

  const safeImageKeys = Array.isArray(imageKeys) ? imageKeys : [];
  const imageCount = safeImageKeys.length;

  const selectIndex = useCallback(
    (nextIndex) => {
      if (imageCount <= 1) return;

      const clampedIndex = getClampedImageIndex(nextIndex, imageCount);

      onSelectIndex?.(clampedIndex);
    },
    [imageCount, onSelectIndex]
  );

  const selectIndexFromTouch = useCallback(
    (nativeEvent) => {
      if (imageCount <= 1) return;

      const touch = nativeEvent?.touches?.[0] ?? nativeEvent?.changedTouches?.[0];
      const pageY = touch?.pageY ?? nativeEvent?.pageY;

      if (!Number.isFinite(pageY)) return;

      const { height, pageY: railPageY } = railLayoutRef.current;
      const relativeY = clamp(pageY - railPageY, 0, Math.max(height, 1));
      const stepHeight = Math.max(height / imageCount, 1);
      const nextIndex = Math.floor(relativeY / stepHeight);

      selectIndex(nextIndex);
    },
    [imageCount, selectIndex]
  );

  const dashPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => imageCount > 1,
        onStartShouldSetPanResponderCapture: () => imageCount > 1,
        onMoveShouldSetPanResponder: () => imageCount > 1,
        onMoveShouldSetPanResponderCapture: () => imageCount > 1,

        onPanResponderGrant: (responderEvent) => {
          selectIndexFromTouch(responderEvent.nativeEvent);
        },

        onPanResponderMove: (responderEvent) => {
          selectIndexFromTouch(responderEvent.nativeEvent);
        },

        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [imageCount, selectIndexFromTouch]
  );

  if (imageCount === 0) return null;

  const clampedActiveIndex = getClampedImageIndex(activeIndex, imageCount);
  const activeImageKey = safeImageKeys[clampedActiveIndex];

  return (
    <View pointerEvents="box-none" style={styles.heroImageGalleryLayer}>
      <Image
        pointerEvents="none"
        resizeMode="cover"
        source={getEventDetailImage(activeImageKey)}
        style={styles.heroImage}
      />

      {imageCount > 1 && (
        <View
          onLayout={(layoutEvent) => {
            const { height, width } = layoutEvent.nativeEvent.layout;
            const nextLayout = {
              height: Math.max(height, 1),
              pageY: railLayoutRef.current.pageY,
              width: Math.max(width, 1),
            };

            railLayoutRef.current = nextLayout;
            railRef.current?.measureInWindow?.((_, pageY) => {
              railLayoutRef.current = {
                ...nextLayout,
                pageY,
              };
            });
          }}
          ref={railRef}
          style={[
            styles.heroImageDashRail,
            {
              top: topInset + 108,
            },
          ]}
          {...dashPanResponder.panHandlers}
        >
          {safeImageKeys.map((imageKey, index) => {
            const isActive = index === clampedActiveIndex;

            return (
              <Pressable
                accessibilityLabel={`Show event image ${index + 1}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                hitSlop={{
                  bottom: 7,
                  left: 14,
                  right: 14,
                  top: 7,
                }}
                key={`${imageKey}-${index}`}
                onPress={() => selectIndex(index)}
                style={styles.heroImageDashHitArea}
              >
                <View
                  style={[
                    styles.heroImageDash,
                    isActive && styles.heroImageDashActive,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [event, setEvent] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [isMiniMapInteracting, setIsMiniMapInteracting] = useState(false);
  const [isParticipationUpdating, setIsParticipationUpdating] = useState(false);
  const [selectedHeroImageIndex, setSelectedHeroImageIndex] = useState(0);
  const sheetY = useRef(new Animated.Value(0)).current;
  const currentSheetY = useRef(0);
  const sheetStartY = useRef(0);
  const scrollOffsetY = useRef(0);
  const scrollViewRef = useRef(null);
  const isMiniMapTouchActiveRef = useRef(false);
  const miniMapScrollStartOffsetY = useRef(0);
  const saveScale = useRef(new Animated.Value(1)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;

  const expandedY = 0;
  const ctaHeight = CTA_HEIGHT + CTA_BOTTOM_GAP;
  const collapsedY = Math.max(expandedY, height - ctaHeight - SHEET_COLLAPSED_HEIGHT);
  const expandedTitleSpacer =
    BACK_BUTTON_TOP_OFFSET +
    BACK_BUTTON_SIZE +
    8 -
    (SHEET_HANDLE_TOP_PADDING + SHEET_HANDLE_HEIGHT + SHEET_HANDLE_BOTTOM_PADDING);
  const sheetHandleTopPadding = sheetY.interpolate({
    inputRange: [expandedY, collapsedY],
    outputRange: [insets.top + SHEET_HANDLE_TOP_PADDING, SHEET_HANDLE_TOP_PADDING],
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

  const animateSavePulse = useCallback(() => {
    saveScale.setValue(0.82);
    Animated.spring(saveScale, {
      damping: 8,
      mass: 0.45,
      stiffness: 320,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [saveScale]);

  const animateCtaPress = useCallback(() => {
    Animated.sequence([
      Animated.timing(ctaScale, {
        duration: 70,
        toValue: 0.96,
        useNativeDriver: true,
      }),
      Animated.spring(ctaScale, {
        damping: 9,
        mass: 0.55,
        stiffness: 260,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [ctaScale]);

  async function triggerDoubleHaptic() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
    await wait(95);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
  }

  const animateSheetTo = useCallback(
    (destination) => {
      const willExpand = destination === expandedY;

      if (!willExpand) {
        resetScrollToTop();
      }

      setIsSheetExpanded(willExpand);
      if (willExpand !== isSheetExpanded) {
        logInteraction(LOG_ACTIONS.eventDetailSheetChanged, {
          eventId: event?.id,
          result: willExpand ? "expanded" : "collapsed",
          route: pathname,
          screen: "EventDetailScreen",
          source: "detail_sheet",
        }).catch(() => null);
      }
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
    [event?.id, expandedY, isSheetExpanded, pathname, resetScrollToTop, sheetY]
  );

  const handleMiniMapTouchActiveChange = useCallback((isActive) => {
    isMiniMapTouchActiveRef.current = isActive;
  }, []);

  const beginMiniMapContentGesture = useCallback(() => {
    miniMapScrollStartOffsetY.current = scrollOffsetY.current;
  }, []);

  const updateMiniMapContentGesture = useCallback(
    (gestureState) => {
      if (!isSheetExpanded) return;

      const nextOffsetY = Math.max(
        0,
        miniMapScrollStartOffsetY.current - gestureState.dy
      );

      scrollOffsetY.current = nextOffsetY;
      scrollViewRef.current?.scrollTo?.({
        animated: false,
        y: nextOffsetY,
      });
    },
    [isSheetExpanded]
  );

  const finishMiniMapContentGesture = useCallback(() => {
    // One-finger mini-map drags should behave like scrolling static content.
  }, []);

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
            clamp(sheetStartY.current + gestureState.dy, expandedY, collapsedY)
          );
        },
        onPanResponderRelease: (_, gestureState) => {
          const midpoint = (expandedY + collapsedY) / 2;
          const shouldExpand =
            gestureState.vy < -0.35 || currentSheetY.current < midpoint;

          animateSheetTo(shouldExpand ? expandedY : collapsedY);
        },
      }),
    [animateSheetTo, collapsedY, expandedY, sheetY]
  );

  const sheetExpansionResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          !isMiniMapTouchActiveRef.current &&
          !isSheetExpanded &&
          gestureState.dy < -8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          sheetStartY.current = currentSheetY.current;
        },
        onPanResponderMove: (_, gestureState) => {
          sheetY.setValue(
            clamp(sheetStartY.current + gestureState.dy, expandedY, collapsedY)
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
    [animateSheetTo, collapsedY, expandedY, isSheetExpanded, sheetY]
  );

  const scrollCollapseResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          !isMiniMapTouchActiveRef.current &&
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
    [animateSheetTo, collapsedY, expandedY, isSheetExpanded, sheetY]
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
      setIsSaved(Boolean(selectedEvent?.canSave && selectedEvent?.isSaved));
    }

    loadEvent();
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      if (!eventId) return undefined;

      logInteraction(LOG_ACTIONS.eventDetailOpened, {
        eventId,
        route: pathname,
        screen: "EventDetailScreen",
      }).catch(() => null);

      return undefined;
    }, [eventId, pathname])
  );

  const heroImageKeys = useMemo(() => getEventHeroImageKeys(event), [event]);

  useEffect(() => {
    setSelectedHeroImageIndex(0);
  }, [event?.id]);

  useEffect(() => {
    setSelectedHeroImageIndex((currentIndex) =>
      getClampedImageIndex(currentIndex, heroImageKeys.length)
    );
  }, [heroImageKeys.length]);

  const handleHeroImageSelect = useCallback((nextIndex) => {
    setSelectedHeroImageIndex((currentIndex) => {
      if (currentIndex === nextIndex) return currentIndex;

      Haptics.selectionAsync().catch(() => null);
      return nextIndex;
    });
  }, []);

  async function handleJoin() {
    if (isParticipationUpdating) return;

    if (!event || event.isJoined || !event.canJoin) {
      if (event && !event.isJoined) {
        logInteraction(LOG_ACTIONS.participationClicked, {
          eventId: event.id,
          reason: event.availability ?? "not_joinable",
          result: "blocked",
          route: pathname,
          screen: "EventDetailScreen",
          source: "detail_cta",
        }).catch(() => null);
      }

      return;
    }

    setIsParticipationUpdating(true);

    try {
      animateCtaPress();
      triggerDoubleHaptic();

      logInteraction(LOG_ACTIONS.participationClicked, {
        eventId: event.id,
        result: "requested",
        route: pathname,
        screen: "EventDetailScreen",
        source: "detail_cta",
      }).catch(() => null);

      const updatedEvent = await joinEvent(event.id);

      if (!updatedEvent) {
        logInteraction(LOG_ACTIONS.participationConfirmed, {
          eventId: event.id,
          reason: "join_failed",
          result: "failed",
          route: pathname,
          screen: "EventDetailScreen",
          source: "detail_cta",
        }).catch(() => null);
        return;
      }

      setEvent(updatedEvent);
      setIsSaved(Boolean(updatedEvent?.canSave && updatedEvent?.isSaved));

      logInteraction(LOG_ACTIONS.participationConfirmed, {
        eventId: event.id,
        route: pathname,
        screen: "EventDetailScreen",
        source: "detail_cta",
        result: updatedEvent.isJoined ? "joined" : "unchanged",
      }).catch(() => null);
    } finally {
      setIsParticipationUpdating(false);
    }
  }

  async function handleCancelParticipation() {
    if (isParticipationUpdating || !event?.isJoined) return;

    setIsParticipationUpdating(true);

    try {
      Haptics.selectionAsync().catch(() => null);

      logInteraction(LOG_ACTIONS.participationClicked, {
        eventId: event.id,
        result: "cancel_requested",
        route: pathname,
        screen: "EventDetailScreen",
        source: "detail_cta_cancel",
      }).catch(() => null);

      const updatedEvent = await cancelEventParticipation(event.id);

      if (!updatedEvent) {
        logInteraction(LOG_ACTIONS.participationConfirmed, {
          eventId: event.id,
          reason: "cancel_failed",
          result: "failed",
          route: pathname,
          screen: "EventDetailScreen",
          source: "detail_cta_cancel",
        }).catch(() => null);
        return;
      }

      setEvent(updatedEvent);
      setIsSaved(Boolean(updatedEvent?.canSave && updatedEvent?.isSaved));

      logInteraction(LOG_ACTIONS.participationConfirmed, {
        eventId: event.id,
        route: pathname,
        screen: "EventDetailScreen",
        source: "detail_cta_cancel",
        result: updatedEvent.isJoined ? "cancel_failed" : "canceled",
      }).catch(() => null);
    } finally {
      setIsParticipationUpdating(false);
    }
  }

  function handleBackPress() {
    logInteraction(LOG_ACTIONS.eventDetailBackPressed, {
      eventId: event?.id,
      route: pathname,
      screen: "EventDetailScreen",
      source: "back_button",
    }).catch(() => null);
    router.back();
  }

  async function handleSavePress() {
    if (!event?.canSave) return;

    const nextIsSaved = !isSaved;

    setIsSaved(nextIsSaved);
    animateSavePulse();
    Haptics.selectionAsync().catch(() => null);

    try {
      const updatedEvent = await toggleSavedEvent(event.id);
      setEvent(updatedEvent);
      setIsSaved(Boolean(updatedEvent?.canSave && updatedEvent?.isSaved));
      logInteraction(LOG_ACTIONS.eventBookmarkToggled, {
        eventId: event.id,
        isSaved: Boolean(updatedEvent?.isSaved),
        route: pathname,
        screen: "EventDetailScreen",
        source: "detail",
      }).catch(() => null);
    } catch {
      setIsSaved(!nextIsSaved);
    }
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <ScreenStatusBar variant="lightBackground" />
        <Text style={styles.loadingText}>Evento não encontrado ou a carregar...</Text>
      </View>
    );
  }

  const price = event.price?.toUpperCase?.() ?? "FREE";
  const timeRange = getEventTimeRange(event);
  const statusBarVariant = isSheetExpanded ? "lightBackground" : "image";
  const joinButtonLabel = getJoinButtonLabel(event);
  const shouldShowCancelParticipationButton = event.isJoined;
  const canSaveEvent = event.canSave === true;
  const isJoinButtonDisabled =
    isParticipationUpdating || event.isJoined || !event.canJoin;
  const isCancelButtonDisabled = isParticipationUpdating;

  return (
    <View style={styles.container}>
      <EventHeroImageGallery
        activeIndex={selectedHeroImageIndex}
        imageKeys={heroImageKeys}
        onSelectIndex={handleHeroImageSelect}
        topInset={insets.top}
      />
      <ScreenStatusBar variant={statusBarVariant} withImageOverlay={!isSheetExpanded} />

      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={handleBackPress}
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
            style={[styles.sheetGrabAreaInner, { paddingTop: sheetHandleTopPadding }]}
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
            scrollEnabled={isSheetExpanded && !isMiniMapInteracting}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ height: titleTopSpacer }} />
            <View style={styles.titleRow}>
              <Text style={styles.title}>{event.title}</Text>
              {canSaveEvent && (
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
                      color={isSaved ? colors.primary : colors.iconMuted}
                    />
                  </Animated.View>
                </Pressable>
              )}
            </View>

            <View style={styles.tagsRow}>
              <Tag>{formatShortEventDate(event.date)}</Tag>
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
              <EventMiniMap
                event={event}
                onInteractionChange={setIsMiniMapInteracting}
                onMiniMapTouchActiveChange={handleMiniMapTouchActiveChange}
                onOneFingerContentGestureEnd={finishMiniMapContentGesture}
                onOneFingerContentGestureMove={updateMiniMapContentGesture}
                onOneFingerContentGestureStart={beginMiniMapContentGesture}
              />
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
        <View style={styles.ctaActionsRow}>
          {shouldShowCancelParticipationButton && (
            <Pressable
              accessibilityLabel="Cancel attendance"
              accessibilityRole="button"
              accessibilityState={{ disabled: isCancelButtonDisabled }}
              disabled={isCancelButtonDisabled}
              onPress={handleCancelParticipation}
              style={({ pressed }) => [
                styles.cancelParticipationButton,
                isCancelButtonDisabled && styles.cancelParticipationButtonDisabled,
                pressed && !isCancelButtonDisabled && styles.pressed,
              ]}
            >
              <Text style={styles.cancelParticipationButtonText}>Cancel</Text>
            </Pressable>
          )}

          <Animated.View
            style={[styles.ctaButtonWrapper, { transform: [{ scale: ctaScale }] }]}
          >
            <Pressable
              accessibilityLabel={joinButtonLabel}
              accessibilityRole="button"
              accessibilityState={{ disabled: isJoinButtonDisabled }}
              disabled={isJoinButtonDisabled}
              onPress={handleJoin}
              style={({ pressed }) => [
                styles.ctaButton,
                isJoinButtonDisabled && styles.ctaButtonJoined,
                pressed && !isJoinButtonDisabled && styles.pressed,
              ]}
            >
              <Text style={styles.ctaButtonText}>{joinButtonLabel}</Text>
            </Pressable>
          </Animated.View>
        </View>
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
  loadingText: {
    color: colors.secondaryText,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  heroImageGalleryLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  heroImage: {
    height: `${HERO_IMAGE_HEIGHT_RATIO * 100}%`,
    left: 0,
    position: "absolute",
    resizeMode: "cover",
    right: 0,
    top: 0,
    width: "100%",
  },
  heroImageDashRail: {
    alignItems: "flex-end",
    gap: HERO_IMAGE_DASH_GAP,
    justifyContent: "center",
    minHeight: 120,
    paddingVertical: 8,
    position: "absolute",
    right: HERO_IMAGE_DASH_RIGHT_OFFSET,
    width: HERO_IMAGE_DASH_RAIL_WIDTH,
  },
  heroImageDashHitArea: {
    alignItems: "flex-end",
    height: HERO_IMAGE_DASH_HIT_HEIGHT,
    justifyContent: "center",
    width: HERO_IMAGE_DASH_RAIL_WIDTH,
  },
  heroImageDash: {
    backgroundColor: colors.effects.surfaceRaised,
    borderRadius: HERO_IMAGE_DASH_HEIGHT / 2,
    height: HERO_IMAGE_DASH_HEIGHT,
    opacity: 0.68,
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    width: HERO_IMAGE_DASH_WIDTH,
  },
  heroImageDashActive: {
    backgroundColor: colors.primary,
    opacity: 1,
    width: HERO_IMAGE_ACTIVE_DASH_WIDTH,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.effects.surfaceRaised,
    borderRadius: 22,
    height: BACK_BUTTON_SIZE,
    justifyContent: "center",
    left: 16,
    position: "absolute",
    shadowColor: colors.effects.shadow,
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
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    bottom: 0,
    elevation: 10,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    shadowColor: colors.effects.shadow,
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
    color: colors.text,
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
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  description: {
    color: colors.secondaryText,
    fontSize: 15,
    lineHeight: 23,
  },
  locationText: {
    color: colors.secondaryText,
    fontSize: 15,
    marginBottom: 12,
  },
  mapPreview: {
    backgroundColor: colors.softSurface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    height: MINI_MAP_HEIGHT,
    overflow: "hidden",
  },
  miniMap: {
    ...StyleSheet.absoluteFillObject,
  },
  miniMapGestureGate: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  mapUnavailable: {
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  mapUnavailableText: {
    color: colors.secondaryText,
    fontSize: 12,
    fontWeight: "800",
  },
  eventLocationPin: {
    alignItems: "center",
    height: 48,
    justifyContent: "flex-start",
    overflow: "visible",
    width: 42,
  },
  eventLocationPinHead: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.text,
    borderRadius: 18,
    borderWidth: 2,
    elevation: 4,
    height: 36,
    justifyContent: "center",
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    width: 36,
  },
  eventLocationPinTip: {
    backgroundColor: colors.primary,
    borderBottomWidth: 2,
    borderColor: colors.text,
    borderRightWidth: 2,
    height: 12,
    marginTop: -8,
    transform: [{ rotate: "45deg" }],
    width: 12,
  },
  miniUserLocationMarker: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    overflow: "visible",
    width: 36,
  },
  miniUserLocationPulse: {
    backgroundColor: colors.effects.primaryIndicator,
    borderRadius: 18,
    height: 36,
    opacity: 0.35,
    position: "absolute",
    width: 36,
  },
  miniUserLocationRing: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 3,
    elevation: 3,
    height: 24,
    justifyContent: "center",
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    width: 24,
  },
  miniUserLocationDot: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  mapRecenterButton: {
    alignItems: "center",
    borderRadius: MINI_MAP_BUTTON_SIZE / 2,
    bottom: 12,
    elevation: 5,
    height: MINI_MAP_BUTTON_SIZE,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.16,
    shadowRadius: 9,
    width: MINI_MAP_BUTTON_SIZE,
    zIndex: 3,
  },
  mapRecenterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.text,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 1,
  },
  mapRecenterButtonInactive: {
    backgroundColor: colors.effects.surfaceRaised,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.56,
  },
  eyebrow: {
    color: colors.secondaryText,
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
    backgroundColor: colors.softSurface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    gap: 12,
    padding: 14,
  },
  reviewCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    flexDirection: "row",
    minHeight: 54,
    paddingHorizontal: 12,
  },
  reviewText: {
    color: colors.secondaryText,
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
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
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
    shadowColor: colors.effects.shadow,
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
  ctaActionsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  ctaButtonWrapper: {
    flex: 1,
  },
  ctaButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 52,
    width: "100%",
  },
  ctaButtonJoined: {
    backgroundColor: colors.effects.primaryDisabled,
  },
  ctaButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  cancelParticipationButton: {
    alignItems: "center",
    backgroundColor: colors.status.error,
    borderColor: colors.status.error,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  cancelParticipationButtonDisabled: {
    opacity: 0.56,
  },
  cancelParticipationButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.72,
  },
});
