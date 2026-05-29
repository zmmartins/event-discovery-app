import { Ionicons } from "@expo/vector-icons";
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
  EVENT_PIN_METRICS,
  getEventPinLayout,
  getEventPinMarkerAnchor,
} from "../components/EventPin";
import MorphingEventPreview from "../components/MorphingEventPreview";
import PopularityAura, {
  getPopularityAuraConfig,
} from "../components/PopularityAura";
import { useDiscoveryMode } from "../context/DiscoveryModeContext";
import useInteractionLogger from "../hooks/useInteractionLogger";
import { getEvents } from "../services/eventService";
import { LOG_ACTIONS, logInteraction } from "../services/interactionLogService";
import { getForegroundUserLocation } from "../services/locationService";
import { colors } from "../theme/colors";
import { APP_MAP_STYLE } from "../theme/mapStyle";

const LISBON_REGION = {
  latitude: 38.7223,
  latitudeDelta: 0.06,
  longitude: -9.1393,
  longitudeDelta: 0.06,
};

const PREVIEW_HORIZONTAL_PADDING = 20;
const PREVIEW_MAX_WIDTH = 380;
const PREVIEW_CARD_HEIGHT = 216;
const LOCATION_CENTER_ANIMATION_MS = 700;
const USER_CENTER_TOLERANCE_METERS = 80;
const LOCATION_GLASS_COLOR_SCHEME = "light";
const LOCATION_GLASS_TINT_COLOR = colors.effects.glassTint;

// Custom react-native-maps markers are rendered as native snapshots.
// Keep tracking enabled briefly after visual changes, then disable it again
// for performance. This prevents random blank/disappearing custom markers.
const MARKER_VIEW_TRACKING_MS = 900;

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

function getPreviewGeometry({ pinLayout, screenWidth, startPoint, tailTipPoint }) {
  const tailHeight = EVENT_PIN_METRICS.tailHeight;
  const tailWidth = EVENT_PIN_METRICS.tailWidth;
  const previewHeight = PREVIEW_CARD_HEIGHT + tailHeight;
  const previewWidth = Math.min(
    PREVIEW_MAX_WIDTH,
    screenWidth - PREVIEW_HORIZONTAL_PADDING * 2
  );

  const left = clamp(
    tailTipPoint.x - previewWidth / 2,
    PREVIEW_HORIZONTAL_PADDING,
    screenWidth - PREVIEW_HORIZONTAL_PADDING - previewWidth
  );

  const top = tailTipPoint.y - PREVIEW_CARD_HEIGHT - tailHeight;

  const tailLeft = tailTipPoint.x - left - tailWidth / 2;
  const tailTop = PREVIEW_CARD_HEIGHT;

  return {
    cloneHeight: pinLayout.containerHeight,
    cloneLeft: startPoint.x - pinLayout.containerSize / 2,
    cloneTop: startPoint.y - pinLayout.tailTipY,
    cloneWidth: pinLayout.containerSize,
    height: previewHeight,
    left,
    tailLeft,
    tailTop,
    top,
    width: previewWidth,
  };
}

function coordinateToScreenPoint({ coordinate, region, screenHeight, screenWidth }) {
  if (!coordinate || !region) return null;

  const longitudeDelta = region.longitudeDelta || LISBON_REGION.longitudeDelta;
  const latitudeDelta = region.latitudeDelta || LISBON_REGION.latitudeDelta;
  const longitudeMin = region.longitude - longitudeDelta / 2;
  const latitudeMax = region.latitude + latitudeDelta / 2;
  const x =
    ((coordinate.longitude - longitudeMin) / longitudeDelta) * screenWidth;
  const y =
    ((latitudeMax - coordinate.latitude) / latitudeDelta) * screenHeight;

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return { x, y };
}

function MapPinAuraOverlay({ event, region, screenHeight, screenWidth }) {
  const layout = getEventPinLayout(event);
  const { auraSize } = getPopularityAuraConfig(event.popularity);
  const point = coordinateToScreenPoint({
    coordinate: {
      latitude: event.latitude,
      longitude: event.longitude,
    },
    region,
    screenHeight,
    screenWidth,
  });

  if (!point) return null;

  const pinCenterY =
    point.y -
    layout.tailTipY +
    layout.circleOffset +
    EVENT_PIN_METRICS.circleSize / 2;

  return (
    <PopularityAura
      animated
      popularity={event.popularity}
      style={{
        left: point.x - auraSize / 2,
        top: pinCenterY - auraSize / 2,
      }}
    />
  );
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
          colorScheme={LOCATION_GLASS_COLOR_SCHEME}
          glassEffectStyle="regular"
          isInteractive={false}
          style={surfaceStyle}
          tintColor={LOCATION_GLASS_TINT_COLOR}
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
  const markerRefreshFrameRef = useRef(null);
  const markerTrackingTimeoutRef = useRef(null);

  const [events, setEvents] = useState([]);
  const [displayedRegion, setDisplayedRegion] = useState(LISBON_REGION);
  const [locationStatus, setLocationStatus] = useState(
    sessionLocationStatus === "idle" ? "locating" : sessionLocationStatus
  );
  const [isMapCenteredOnUser, setIsMapCenteredOnUser] = useState(false);
  const [previewGeometry, setPreviewGeometry] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userLocation, setUserLocation] = useState(sessionUserLocation);
  const [shouldTrackMarkerViewChanges, setShouldTrackMarkerViewChanges] = useState(true);

  const { deactivateDiscoveryMode, filterDiscoveryEvents, isDiscoveryActive } =
    useDiscoveryMode();

  useInteractionLogger(LOG_ACTIONS.mapViewOpened, {
    screen: "MapScreen",
  });

  const requestMarkerViewRefresh = useCallback(() => {
    if (markerTrackingTimeoutRef.current) {
      clearTimeout(markerTrackingTimeoutRef.current);
    }

    setShouldTrackMarkerViewChanges(true);

    markerTrackingTimeoutRef.current = setTimeout(() => {
      setShouldTrackMarkerViewChanges(false);
      markerTrackingTimeoutRef.current = null;
    }, MARKER_VIEW_TRACKING_MS);
  }, []);

  const requestMarkerViewRefreshAfterCommit = useCallback(() => {
    if (markerRefreshFrameRef.current) {
      cancelAnimationFrame(markerRefreshFrameRef.current);
    }

    markerRefreshFrameRef.current = requestAnimationFrame(() => {
      markerRefreshFrameRef.current = null;
      requestMarkerViewRefresh();
    });
  }, [requestMarkerViewRefresh]);

  useEffect(() => {
    requestMarkerViewRefresh();

    return () => {
      if (markerTrackingTimeoutRef.current) {
        clearTimeout(markerTrackingTimeoutRef.current);
        markerTrackingTimeoutRef.current = null;
      }

      if (markerRefreshFrameRef.current) {
        cancelAnimationFrame(markerRefreshFrameRef.current);
        markerRefreshFrameRef.current = null;
      }
    };
  }, [requestMarkerViewRefresh]);

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
        requestMarkerViewRefresh();

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
      isRecenteringOnUserRef.current = false;
      setLocationStatus(sessionLocationStatus);
      setIsMapCenteredOnUser(false);
      requestMarkerViewRefresh();
    },
    [centerMapOnUser, requestMarkerViewRefresh]
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getEvents().then((nextEvents) => {
        if (isActive) {
          const filteredEvents = filterDiscoveryEvents(nextEvents);

          setEvents(filteredEvents);
          requestMarkerViewRefresh();
        }
      });

      return () => {
        isActive = false;
        setPreviewGeometry(null);
        setSelectedEvent(null);
        if (markerRefreshFrameRef.current) {
          cancelAnimationFrame(markerRefreshFrameRef.current);
          markerRefreshFrameRef.current = null;
        }
        requestMarkerViewRefresh();
      };
    }, [filterDiscoveryEvents, requestMarkerViewRefresh])
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

        requestMarkerViewRefresh();

        return () => {
          isActive = false;
        };
      }

      hasAutoCenteredOnUserThisSession = true;
      sessionLocationStatus = "locating";
      setLocationStatus("locating");
      requestMarkerViewRefresh();

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
    }, [applyLocationResult, pathname, requestMarkerViewRefresh])
  );

  const handlePreviewCloseComplete = useCallback(() => {
    requestMarkerViewRefresh();
    setPreviewGeometry(null);
    setSelectedEvent(null);
    requestMarkerViewRefreshAfterCommit();
  }, [requestMarkerViewRefresh, requestMarkerViewRefreshAfterCommit]);

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

      requestMarkerViewRefresh();

      if (morphPreviewRef.current?.close) {
        morphPreviewRef.current.close(reason);
        return;
      }

      handlePreviewCloseComplete();
    },
    [handlePreviewCloseComplete, pathname, requestMarkerViewRefresh, selectedEvent]
  );

  const handleRegionChange = useCallback((region) => {
    currentRegionRef.current = region;
    setDisplayedRegion(region);
  }, []);

  const handleRegionChangeComplete = useCallback(
    (region) => {
      currentRegionRef.current = region;
      setDisplayedRegion(region);
      const isCenteredOnUser = isRegionCenteredOnCoordinate(region, userLocation);

      if (isCenteredOnUser) {
        isRecenteringOnUserRef.current = false;
        setIsMapCenteredOnUser(true);
      } else if (!isRecenteringOnUserRef.current) {
        setIsMapCenteredOnUser(false);
      }
    },
    [userLocation]
  );

  const handleMapReady = useCallback(() => {
    isMapReadyRef.current = true;
    requestMarkerViewRefresh();

    if (pendingInitialLocationRegionRef.current) {
      mapRef.current?.animateToRegion(
        pendingInitialLocationRegionRef.current,
        LOCATION_CENTER_ANIMATION_MS
      );
      pendingInitialLocationRegionRef.current = null;
    }
  }, [requestMarkerViewRefresh]);

  const handleMapPress = useCallback(() => {
    if (selectedEvent) {
      closePreview("map_press");
    }
  }, [closePreview, selectedEvent]);

  const handleMapPanDrag = useCallback(() => {
    isRecenteringOnUserRef.current = false;
    setIsMapCenteredOnUser(false);

    if (selectedEvent) {
      closePreview("map_pan");
    }
  }, [closePreview, selectedEvent]);

  const handlePinPress = useCallback(
    async (event) => {
      if (markerRefreshFrameRef.current) {
        cancelAnimationFrame(markerRefreshFrameRef.current);
        markerRefreshFrameRef.current = null;
      }

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

      const tailTipPoint = startPoint;
      const pinLayout = getEventPinLayout(event);
      const nextPreviewGeometry = getPreviewGeometry({
        pinLayout,
        screenWidth,
        startPoint,
        tailTipPoint,
      });

      isRecenteringOnUserRef.current = false;
      setPreviewGeometry(nextPreviewGeometry);
      setSelectedEvent(event);
      setIsMapCenteredOnUser(
        isRegionCenteredOnCoordinate(currentRegionRef.current, userLocation)
      );
      requestMarkerViewRefresh();

      // Intentionally do not recenter the map when opening a pin preview.
      // Keeping the map stable preserves the morph illusion between pin and preview.

      logInteraction(LOG_ACTIONS.eventPinSelected, {
        eventId: event.id,
        route: pathname,
        screen: "MapScreen",
        source: "map_pin",
      }).catch(() => null);
    },
    [
      pathname,
      requestMarkerViewRefresh,
      screenHeight,
      screenWidth,
      userLocation,
    ]
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

    requestMarkerViewRefresh();
    setPreviewGeometry(null);
    setSelectedEvent(null);
    requestMarkerViewRefreshAfterCommit();

    router.push({
      pathname: "/event/[id]",
      params: { id: eventId },
    });
  }, [
    pathname,
    requestMarkerViewRefresh,
    requestMarkerViewRefreshAfterCommit,
    router,
    selectedEvent,
  ]);

  const handlePreviewSavedChange = useCallback(
    (updatedEvent) => {
      if (!updatedEvent) return;

      requestMarkerViewRefresh();
      setSelectedEvent(updatedEvent);
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === updatedEvent.id ? updatedEvent : event
        )
      );
    },
    [requestMarkerViewRefresh]
  );

  const handleDiscoverDismiss = useCallback(() => {
    closePreview("discover_disabled");
    deactivateDiscoveryMode({
      route: pathname,
      screen: "MapScreen",
      source: "discover_pill",
    });
    requestMarkerViewRefresh();
  }, [closePreview, deactivateDiscoveryMode, pathname, requestMarkerViewRefresh]);

  const handleLocationStatusPress = useCallback(() => {
    logInteraction(LOG_ACTIONS.userLocationRecentered, {
      route: pathname,
      screen: "MapScreen",
      source: "location_status_indicator",
    }).catch(() => null);

    if (userLocation) {
      centerMapOnUser(userLocation);
      requestMarkerViewRefresh();
      return;
    }

    isRecenteringOnUserRef.current = false;
    sessionLocationStatus = "locating";
    setLocationStatus("locating");
    setIsMapCenteredOnUser(false);
    requestMarkerViewRefresh();

    getForegroundUserLocation({
      route: pathname,
      screen: "MapScreen",
      source: "location_status_indicator",
    }).then((result) => {
      applyLocationResult(result, true);
    });
  }, [
    applyLocationResult,
    centerMapOnUser,
    pathname,
    requestMarkerViewRefresh,
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
        provider={PROVIDER_GOOGLE}
        ref={mapRef}
        showsBuildings={false}
        showsCompass={false}
        showsIndoors={false}
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        showsTraffic={false}
        style={styles.map}
        toolbarEnabled={false}
      >
        {events.map((event) => {
          const isSelectedEvent = selectedEvent?.id === event.id;

          return (
            <Marker
              anchor={getEventPinMarkerAnchor(event)}
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              key={event.id}
              onPress={(markerEvent) => handleMarkerPress(markerEvent, event)}
              tracksViewChanges={shouldTrackMarkerViewChanges || isDiscoveryActive}
              zIndex={1}
            >
              <View style={isSelectedEvent ? styles.hiddenMapMarker : null}>
                <EventPin event={event} showPopularityAura={false} />
              </View>
            </Marker>
          );
        })}

        {userLocation && (
          <Marker
            anchor={{ x: 0.5, y: 0.5 }}
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            key="user-location"
            tappable={false}
            tracksViewChanges={shouldTrackMarkerViewChanges}
            zIndex={1000}
          >
            <CurrentLocationMarker />
          </Marker>
        )}
      </MapView>

      <View pointerEvents="none" style={styles.auraOverlayLayer}>
        {events.map((event) => {
          const isSelectedEvent = selectedEvent?.id === event.id;

          if (isSelectedEvent) return null;

          return (
            <MapPinAuraOverlay
              event={event}
              key={event.id}
              region={displayedRegion}
              screenHeight={screenHeight}
              screenWidth={screenWidth}
            />
          );
        })}
      </View>

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
  auraOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  locationStatus: {
    position: "absolute",
    right: 18,
    zIndex: 1,
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
    backgroundColor: colors.effects.primaryPressed,
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
  hiddenMapMarker: {
    opacity: 0,
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
