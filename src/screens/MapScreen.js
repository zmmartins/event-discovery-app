import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DiscoverModePill from "../components/DiscoverModePill";
import EventPin, {
  getEventPinMarkerAnchor,
  getSessionEventPinLayout,
} from "../components/EventPin";
import MorphingEventPreview from "../components/MorphingEventPreview";
import { useDiscoveryMode } from "../context/DiscoveryModeContext";
import useInteractionLogger from "../hooks/useInteractionLogger";
import { getEvents } from "../services/eventService";
import { LOG_ACTIONS, logInteraction } from "../services/interactionLogService";
import { getForegroundUserLocation } from "../services/locationService";
import { colors } from "../theme/colors";
import {
  LIQUID_GLASS_COLOR_SCHEME,
  LIQUID_GLASS_EFFECT_STYLE,
  LIQUID_GLASS_TINT_COLOR,
} from "../theme/liquidGlass";
import { APP_MAP_STYLE } from "../theme/mapStyle";

const LISBON_REGION = {
  latitude: 38.7223,
  latitudeDelta: 0.06,
  longitude: -9.1393,
  longitudeDelta: 0.06,
};

const PREVIEW_HORIZONTAL_PADDING = 20;
const PREVIEW_MAX_WIDTH = 300;
const PREVIEW_POSTER_HORIZONTAL_PADDING = 14;
const PREVIEW_POSTER_TOP_PADDING = 16;
const PREVIEW_POSTER_BOTTOM_PADDING = 16;
const PREVIEW_HEADER_HEIGHT = 150;
const PREVIEW_IMAGE_GAP = 14;
const PREVIEW_BOTTOM_GAP = 14;
const PREVIEW_META_HEIGHT = 58;
const PREVIEW_BASE_CARD_HEIGHT = 520;
const PREVIEW_MAX_CARD_HEIGHT = 680;

const LOCATION_CENTER_ANIMATION_MS = 700;
const EVENT_CENTER_ANIMATION_MS = 100;
const EVENT_CENTER_TOLERANCE_METERS = 30;
const USER_CENTER_TOLERANCE_METERS = 80;

let hasAutoCenteredOnUserThisSession = false;
let sessionLocationStatus = "idle";
let sessionUserLocation = null;

function getLiquidGlassAvailable() {
  if (Platform.OS !== "ios") return false;

  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

function getEventPinZIndex(event) {
  const popularity = clamp(Number(event.popularity) || 0, 0, 100);
  return Math.round(popularity * 10);
}

const liquidGlassAvailable = getLiquidGlassAvailable();

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

function isRegionCenteredOnCoordinate(region, coordinate) {
  if (!region || !coordinate) return false;

  return (
    getCoordinateDistanceMeters(
      {
        latitude: region.latitude,
        longitude: region.longitude,
      },
      coordinate
    ) <= USER_CENTER_TOLERANCE_METERS
  );
}

function getPreviewCardHeight(imageSize) {
  const estimatedHeight =
    PREVIEW_POSTER_TOP_PADDING +
    PREVIEW_HEADER_HEIGHT +
    PREVIEW_IMAGE_GAP +
    imageSize +
    PREVIEW_BOTTOM_GAP +
    PREVIEW_META_HEIGHT +
    PREVIEW_POSTER_BOTTOM_PADDING;

  return clamp(
    estimatedHeight,
    PREVIEW_BASE_CARD_HEIGHT,
    PREVIEW_MAX_CARD_HEIGHT
  );
}

function getPreviewGeometry({ pinLayout, screenHeight, screenWidth, startPoint }) {
  const previewWidth = Math.min(
    PREVIEW_MAX_WIDTH,
    screenWidth - PREVIEW_HORIZONTAL_PADDING * 2
  );

  const posterPadding = PREVIEW_POSTER_HORIZONTAL_PADDING;
  const imageSize = previewWidth - posterPadding * 2;
  const cardHeight = getPreviewCardHeight(imageSize);

  const left = (screenWidth - previewWidth) / 2;
  const top = Math.max(
    PREVIEW_HORIZONTAL_PADDING,
    (screenHeight - cardHeight) / 2
  );

  return {
    cardHeight,
    imageSize,
    posterPadding,
    posterTopPadding: PREVIEW_POSTER_TOP_PADDING,
    posterHeaderHeight: PREVIEW_HEADER_HEIGHT,
    posterImageGap: PREVIEW_IMAGE_GAP,
    posterBottomGap: PREVIEW_BOTTOM_GAP,
    posterMetaHeight: PREVIEW_META_HEIGHT,
    posterBottomPadding: PREVIEW_POSTER_BOTTOM_PADDING,

    cloneHeight: pinLayout.outerSize,
    cloneLeft: startPoint.x - pinLayout.outerSize / 2,
    cloneTop: startPoint.y - pinLayout.outerSize / 2,
    cloneWidth: pinLayout.outerSize,

    height: cardHeight,
    left,
    top,
    width: previewWidth,
  };
}

function CurrentLocationMarker() {
  return (
    <View pointerEvents="none" style={styles.userLocationMarker}>
      <View style={styles.userLocationPulse} />
      <View style={styles.userLocationRing}>
        <View style={styles.userLocationDot} />
      </View>
    </View>
  );
}

function getLocationStatusLabel(status) {
  if (status === "locating") return "LOCATING";
  if (status === "available") return "NEAR YOU";

  return "LISBON";
}

function LocationStatusIndicator({ isCenteredOnUser, onPress, status, top }) {
  const isAvailable = status === "available";
  const isLocating = status === "locating";
  const isActive = isAvailable && isCenteredOnUser;

  const surfaceStyle = [
    styles.locationStatusSurface,
    isActive && styles.locationStatusActive,
    isAvailable && !isActive && styles.locationStatusInactive,
    isLocating && styles.locationStatusDisabled,
  ];

  const content = (
    <>
      <Ionicons
        name={isLocating ? "radio-outline" : "location"}
        size={14}
        color={isActive ? colors.iconActive : colors.iconMuted}
      />
      <Text
        style={[styles.locationStatusText, isActive && styles.locationStatusTextActive]}
      >
        {getLocationStatusLabel(status)}
      </Text>
    </>
  );

  return (
    <Pressable
      accessibilityHint="Centers the map on your current location"
      accessibilityLabel="Recenter map to your location"
      accessibilityRole="button"
      accessibilityState={{ disabled: isLocating, selected: isActive }}
      disabled={isLocating}
      onPress={onPress}
      style={({ pressed }) => [
        styles.locationStatus,
        pressed && !isLocating && styles.pressed,
        { top },
      ]}
    >
      {Platform.OS === "ios" && liquidGlassAvailable ? (
        <GlassView
          colorScheme={LIQUID_GLASS_COLOR_SCHEME}
          glassEffectStyle={LIQUID_GLASS_EFFECT_STYLE}
          isInteractive={false}
          style={surfaceStyle}
          tintColor={LIQUID_GLASS_TINT_COLOR}
        >
          {content}
        </GlassView>
      ) : (
        <View style={surfaceStyle}>{content}</View>
      )}
    </Pressable>
  );
}

export default function MapScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();

  const mapRef = useRef(null);
  const isMapReadyRef = useRef(false);
  const isRecenteringOnUserRef = useRef(false);
  const currentRegionRef = useRef(LISBON_REGION);
  const morphPreviewRef = useRef(null);
  const pendingInitialLocationRegionRef = useRef(null);
  const pendingPreviewEventRef = useRef(null);
  const eventCenterTimeoutRef = useRef(null);
  const isRecenteringOnEventRef = useRef(false);
  const hasDismissedPreviewByGestureRef = useRef(false);

  const [events, setEvents] = useState([]);
  const [locationStatus, setLocationStatus] = useState(
    sessionLocationStatus === "idle" ? "locating" : sessionLocationStatus
  );
  const [isMapCenteredOnUser, setIsMapCenteredOnUser] = useState(false);
  const [previewGeometry, setPreviewGeometry] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userLocation, setUserLocation] = useState(sessionUserLocation);

  const { deactivateDiscoveryMode, filterDiscoveryEvents, isDiscoveryActive } =
    useDiscoveryMode();

  useInteractionLogger(LOG_ACTIONS.mapViewOpened, {
    screen: "MapScreen",
  });

  useEffect(() => {
    return () => {
      if (eventCenterTimeoutRef.current) {
        clearTimeout(eventCenterTimeoutRef.current);
        eventCenterTimeoutRef.current = null;
      }
    };
  }, []);

  const cancelPendingEventPreview = useCallback(() => {
    pendingPreviewEventRef.current = null;
    isRecenteringOnEventRef.current = false;

    if (eventCenterTimeoutRef.current) {
      clearTimeout(eventCenterTimeoutRef.current);
      eventCenterTimeoutRef.current = null;
    }
  }, []);

  const centerMapOnRegion = useCallback((region, duration) => {
    currentRegionRef.current = region;

    if (isMapReadyRef.current && mapRef.current) {
      mapRef.current.animateToRegion(region, duration);
      return;
    }

    pendingInitialLocationRegionRef.current = region;
  }, []);

  const centerMapOnCoordinate = useCallback(
    (coordinate, duration = LOCATION_CENTER_ANIMATION_MS) => {
      const currentRegion = currentRegionRef.current || LISBON_REGION;
      const nextRegion = {
        latitude: coordinate.latitude,
        latitudeDelta: currentRegion.latitudeDelta || LISBON_REGION.latitudeDelta,
        longitude: coordinate.longitude,
        longitudeDelta: currentRegion.longitudeDelta || LISBON_REGION.longitudeDelta,
      };

      centerMapOnRegion(nextRegion, duration);
    },
    [centerMapOnRegion]
  );

  const centerMapOnUser = useCallback(
    (coordinate, duration = LOCATION_CENTER_ANIMATION_MS) => {
      isRecenteringOnUserRef.current = true;
      setIsMapCenteredOnUser(true);
      centerMapOnCoordinate(coordinate, duration);
    },
    [centerMapOnCoordinate]
  );

  const applyLocationResult = useCallback(
    (result, shouldCenter) => {
      if (result.status === "available" && result.coordinate) {
        sessionUserLocation = result.coordinate;
        sessionLocationStatus = "available";

        setUserLocation(result.coordinate);
        setLocationStatus("available");

        if (shouldCenter) {
          centerMapOnUser(result.coordinate);
        } else {
          setIsMapCenteredOnUser(
            isRegionCenteredOnCoordinate(currentRegionRef.current, result.coordinate)
          );
        }

        return;
      }

      sessionLocationStatus = result.status === "denied" ? "denied" : "unavailable";
      sessionUserLocation = null;
      isRecenteringOnUserRef.current = false;
      setUserLocation(null);
      setLocationStatus(sessionLocationStatus);
      setIsMapCenteredOnUser(false);
    },
    [centerMapOnUser]
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getEvents().then((nextEvents) => {
        if (isActive) {
          const filteredEvents = filterDiscoveryEvents(nextEvents);

          setEvents(filteredEvents);
        }
      });

      return () => {
        isActive = false;
        cancelPendingEventPreview();
        setPreviewGeometry(null);
        setSelectedEvent(null);
      };
    }, [cancelPendingEventPreview, filterDiscoveryEvents])
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      if (hasAutoCenteredOnUserThisSession) {
        if (sessionUserLocation) {
          setUserLocation(sessionUserLocation);
          setIsMapCenteredOnUser(
            isRegionCenteredOnCoordinate(currentRegionRef.current, sessionUserLocation)
          );
        } else {
          setIsMapCenteredOnUser(false);
        }

        if (sessionLocationStatus !== "idle") {
          setLocationStatus(sessionLocationStatus);
        }

        return () => {
          isActive = false;
        };
      }

      hasAutoCenteredOnUserThisSession = true;
      sessionLocationStatus = "locating";
      setLocationStatus("locating");

      getForegroundUserLocation({
        route: pathname,
        screen: "MapScreen",
        source: "explore_map_initial_focus",
      }).then((result) => {
        if (!isActive) {
          if (result.status === "available" && result.coordinate) {
            sessionUserLocation = result.coordinate;
            sessionLocationStatus = "available";
            return;
          }

          sessionLocationStatus = result.status === "denied" ? "denied" : "unavailable";
          return;
        }

        applyLocationResult(result, true);
      });

      return () => {
        isActive = false;
      };
    }, [applyLocationResult, pathname])
  );

  const handlePreviewCloseComplete = useCallback(() => {
    setPreviewGeometry(null);
    setSelectedEvent(null);
  }, []);

  const closePreview = useCallback(
    (reason) => {
      if (selectedEvent && reason) {
        logInteraction(LOG_ACTIONS.eventPreviewDismissed, {
          eventId: selectedEvent.id,
          reason,
          route: pathname,
          screen: "MapScreen",
        }).catch(() => null);
      }

      if (morphPreviewRef.current?.close) {
        morphPreviewRef.current.close(reason);
        return;
      }

      handlePreviewCloseComplete();
    },
    [handlePreviewCloseComplete, pathname, selectedEvent]
  );

  const dismissPreviewFromOverlayGesture = useCallback(
    (reason) => {
      if (!selectedEvent || hasDismissedPreviewByGestureRef.current) return;

      hasDismissedPreviewByGestureRef.current = true;
      closePreview(reason);
    },
    [closePreview, selectedEvent]
  );

  const handleRegionChange = useCallback((region) => {
    currentRegionRef.current = region;
  }, []);

  const openPreviewForEvent = useCallback(
    async (event) => {
      const coordinate = {
        latitude: event.latitude,
        longitude: event.longitude,
      };

      let startPoint = {
        x: screenWidth / 2,
        y: screenHeight / 2,
      };

      try {
        const nextStartPoint = await mapRef.current?.pointForCoordinate(coordinate);

        if (Number.isFinite(nextStartPoint?.x) && Number.isFinite(nextStartPoint?.y)) {
          startPoint = nextStartPoint;
        }
      } catch {
        startPoint = {
          x: screenWidth / 2,
          y: screenHeight / 2,
        };
      }

      const pinLayout = getSessionEventPinLayout(event);
      const nextPreviewGeometry = getPreviewGeometry({
        event,
        pinLayout,
        screenHeight,
        screenWidth,
        startPoint,
      });

      hasDismissedPreviewByGestureRef.current = false;
      setPreviewGeometry(nextPreviewGeometry);
      setSelectedEvent(event);
      setIsMapCenteredOnUser(
        isRegionCenteredOnCoordinate(currentRegionRef.current, userLocation)
      );
    },
    [screenHeight, screenWidth, userLocation]
  );

  const handleRegionChangeComplete = useCallback(
    (region) => {
      currentRegionRef.current = region;

      const pendingPreviewEvent = pendingPreviewEventRef.current;

      if (pendingPreviewEvent && isRecenteringOnEventRef.current) {
        const eventCoordinate = {
          latitude: pendingPreviewEvent.latitude,
          longitude: pendingPreviewEvent.longitude,
        };

        const isCenteredOnEvent =
          getCoordinateDistanceMeters(
            {
              latitude: region.latitude,
              longitude: region.longitude,
            },
            eventCoordinate
          ) <= EVENT_CENTER_TOLERANCE_METERS;

        if (isCenteredOnEvent) {
          if (eventCenterTimeoutRef.current) {
            clearTimeout(eventCenterTimeoutRef.current);
            eventCenterTimeoutRef.current = null;
          }

          pendingPreviewEventRef.current = null;
          isRecenteringOnEventRef.current = false;
          openPreviewForEvent(pendingPreviewEvent);
          return;
        }
      }

      const isCenteredOnUser = isRegionCenteredOnCoordinate(region, userLocation);

      if (isCenteredOnUser) {
        isRecenteringOnUserRef.current = false;
        setIsMapCenteredOnUser(true);
      } else if (!isRecenteringOnUserRef.current && !isRecenteringOnEventRef.current) {
        setIsMapCenteredOnUser(false);
      }
    },
    [openPreviewForEvent, userLocation]
  );

  const handleMapReady = useCallback(() => {
    isMapReadyRef.current = true;

    if (pendingInitialLocationRegionRef.current) {
      mapRef.current?.animateToRegion(
        pendingInitialLocationRegionRef.current,
        LOCATION_CENTER_ANIMATION_MS
      );
      pendingInitialLocationRegionRef.current = null;
      return;
    }
  }, []);

  const handleMapPress = useCallback(() => {
    cancelPendingEventPreview();

    if (selectedEvent) {
      closePreview("map_press");
    }
  }, [cancelPendingEventPreview, closePreview, selectedEvent]);

  const handleMapPanDrag = useCallback(() => {
    cancelPendingEventPreview();
    isRecenteringOnUserRef.current = false;
    setIsMapCenteredOnUser(false);

    if (selectedEvent) {
      closePreview("map_pan");
    }
  }, [cancelPendingEventPreview, closePreview, selectedEvent]);

  const handlePinPress = useCallback(
    async (event) => {
      const coordinate = {
        latitude: event.latitude,
        longitude: event.longitude,
      };

      if (selectedEvent) {
        setPreviewGeometry(null);
        setSelectedEvent(null);
      }

      pendingPreviewEventRef.current = event;
      isRecenteringOnEventRef.current = true;
      isRecenteringOnUserRef.current = false;
      setIsMapCenteredOnUser(false);

      const currentRegion = currentRegionRef.current || LISBON_REGION;

      const nextRegion = {
        latitude: coordinate.latitude,
        latitudeDelta: currentRegion.latitudeDelta || LISBON_REGION.latitudeDelta,
        longitude: coordinate.longitude,
        longitudeDelta: currentRegion.longitudeDelta || LISBON_REGION.longitudeDelta,
      };

      currentRegionRef.current = nextRegion;

      if (isMapReadyRef.current && mapRef.current) {
        mapRef.current.animateToRegion(nextRegion, EVENT_CENTER_ANIMATION_MS);
      } else {
        pendingInitialLocationRegionRef.current = nextRegion;
      }

      if (eventCenterTimeoutRef.current) {
        clearTimeout(eventCenterTimeoutRef.current);
      }

      eventCenterTimeoutRef.current = setTimeout(() => {
        eventCenterTimeoutRef.current = null;

        if (pendingPreviewEventRef.current?.id === event.id) {
          const pendingEvent = pendingPreviewEventRef.current;
          pendingPreviewEventRef.current = null;
          isRecenteringOnEventRef.current = false;
          openPreviewForEvent(pendingEvent);
        }
      }, EVENT_CENTER_ANIMATION_MS);

      logInteraction(LOG_ACTIONS.eventPinSelected, {
        eventId: event.id,
        route: pathname,
        screen: "MapScreen",
        source: "map_pin",
      }).catch(() => null);
    },
    [openPreviewForEvent, pathname, selectedEvent]
  );

  const handleMarkerPress = useCallback(
    (markerEvent, event) => {
      markerEvent?.stopPropagation?.();
      handlePinPress(event);
    },
    [handlePinPress]
  );

  const openSelectedEvent = useCallback(() => {
    if (!selectedEvent) return;

    const eventId = selectedEvent.id;

    logInteraction(LOG_ACTIONS.eventPreviewDismissed, {
      eventId,
      reason: "open_detail",
      route: pathname,
      screen: "MapScreen",
    }).catch(() => null);

    setPreviewGeometry(null);
    setSelectedEvent(null);

    router.push({
      pathname: "/event/[id]",
      params: { id: eventId },
    });
  }, [pathname, router, selectedEvent]);

  const handlePreviewSavedChange = useCallback((updatedEvent) => {
    if (!updatedEvent) return;

    setSelectedEvent(updatedEvent);
    setEvents((currentEvents) =>
      currentEvents.map((event) => (event.id === updatedEvent.id ? updatedEvent : event))
    );
  }, []);

  const handleDiscoverDismiss = useCallback(() => {
    closePreview("discover_disabled");
    deactivateDiscoveryMode({
      route: pathname,
      screen: "MapScreen",
      source: "discover_pill",
    });
  }, [closePreview, deactivateDiscoveryMode, pathname]);

  const handleLocationStatusPress = useCallback(() => {
    cancelPendingEventPreview();

    logInteraction(LOG_ACTIONS.userLocationRecentered, {
      route: pathname,
      screen: "MapScreen",
      source: "location_status_indicator",
    }).catch(() => null);

    if (userLocation) {
      centerMapOnUser(userLocation);
      return;
    }

    isRecenteringOnUserRef.current = false;
    sessionLocationStatus = "locating";
    setLocationStatus("locating");
    setIsMapCenteredOnUser(false);

    getForegroundUserLocation({
      route: pathname,
      screen: "MapScreen",
      source: "location_status_indicator",
    }).then((result) => {
      applyLocationResult(result, true);
    });
  }, [
    applyLocationResult,
    cancelPendingEventPreview,
    centerMapOnUser,
    pathname,
    userLocation,
  ]);

  return (
    <View style={styles.container}>
      <MapView
        customMapStyle={APP_MAP_STYLE}
        initialRegion={LISBON_REGION}
        loadingBackgroundColor={colors.background}
        loadingEnabled
        loadingIndicatorColor={colors.text}
        mapType="standard"
        onMapReady={handleMapReady}
        onPanDrag={handleMapPanDrag}
        onPress={handleMapPress}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        pitchEnabled
        provider={PROVIDER_GOOGLE}
        ref={mapRef}
        rotateEnabled
        showsBuildings={false}
        showsCompass={false}
        showsIndoors={false}
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        showsTraffic={false}
        style={styles.map}
        toolbarEnabled={false}
      >
        {events.map((event) => (
          <Marker
            anchor={getEventPinMarkerAnchor(event)}
            coordinate={{
              latitude: event.latitude,
              longitude: event.longitude,
            }}
            key={event.id}
            onPress={(markerEvent) => handleMarkerPress(markerEvent, event)}
            tracksViewChanges={false}
            zIndex={getEventPinZIndex(event)}
          >
            <View collapsable={false}>
              <EventPin event={event} />
            </View>
          </Marker>
        ))}

        {userLocation && (
          <Marker
            anchor={{ x: 0.5, y: 0.5 }}
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            key="user-location"
            tappable={false}
            tracksViewChanges={false}
            zIndex={20000}
          >
            <CurrentLocationMarker />
          </Marker>
        )}
      </MapView>

      {selectedEvent && previewGeometry && (
        <Pressable
          accessibilityLabel="Close event preview"
          accessibilityRole="button"
          onPress={() => dismissPreviewFromOverlayGesture("map_press")}
          onTouchMove={() => dismissPreviewFromOverlayGesture("map_pan")}
          style={styles.previewDismissOverlay}
        >
          <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={styles.previewDimOverlay} />
        </Pressable>
      )}

      <LocationStatusIndicator
        isCenteredOnUser={isMapCenteredOnUser}
        onPress={handleLocationStatusPress}
        status={locationStatus}
        top={insets.top + 64}
      />

      {isDiscoveryActive && (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.discoverBorder,
              {
                bottom: insets.bottom,
                left: insets.left,
                right: insets.right,
                top: insets.top,
              },
            ]}
          />
          <DiscoverModePill
            onPress={handleDiscoverDismiss}
            style={[styles.discoverPill, { top: insets.top + 62 }]}
          />
        </>
      )}

      {selectedEvent && previewGeometry && (
        <MorphingEventPreview
          event={selectedEvent}
          geometry={previewGeometry}
          onCloseComplete={handlePreviewCloseComplete}
          onOpen={openSelectedEvent}
          onSavedChange={handlePreviewSavedChange}
          ref={morphPreviewRef}
          screen="MapScreen"
          source="map_preview"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  previewDismissOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  previewDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  locationStatus: {
    position: "absolute",
    right: 18,
    zIndex: 2,
  },
  locationStatusSurface: {
    alignItems: "center",
    backgroundColor: colors.effects.surfaceOverlay,
    borderColor: colors.effects.surfaceBorder,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 5,
    flexDirection: "row",
    gap: 5,
    minHeight: 32,
    overflow: "hidden",
    paddingHorizontal: 10,
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  locationStatusActive: {
    borderColor: colors.primary,
  },
  locationStatusInactive: {
    opacity: 0.78,
  },
  locationStatusDisabled: {
    opacity: 0.78,
  },
  locationStatusText: {
    color: colors.iconMuted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
  },
  locationStatusTextActive: {
    color: colors.text,
  },
  userLocationMarker: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    overflow: "visible",
    width: 42,
  },
  userLocationPulse: {
    backgroundColor: colors.effects.primaryIndicator,
    borderRadius: 21,
    height: 42,
    position: "absolute",
    width: 42,
  },
  userLocationRing: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 15,
    borderWidth: 4,
    elevation: 4,
    height: 30,
    justifyContent: "center",
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    width: 30,
  },
  userLocationDot: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  discoverBorder: {
    ...StyleSheet.absoluteFillObject,
    borderColor: colors.primary,
    borderWidth: 5,
    zIndex: 3,
  },
  discoverPill: {
    left: "50%",
    marginLeft: -45,
    position: "absolute",
    zIndex: 4,
  },
  pressed: {
    opacity: 0.72,
  },
});
