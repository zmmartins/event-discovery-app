import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DiscoverModePill from "../components/DiscoverModePill";
import EventCard from "../components/EventCard";
import EventPin from "../components/EventPin";
import { useDiscoveryMode } from "../context/DiscoveryModeContext";
import useInteractionLogger from "../hooks/useInteractionLogger";
import { getEvents } from "../services/eventService";
import {
  LOG_ACTIONS,
  logInteraction,
} from "../services/interactionLogService";
import { getForegroundUserLocation } from "../services/locationService";
import { colors } from "../theme/colors";

const LISBON_REGION = {
  latitude: 38.7223,
  latitudeDelta: 0.06,
  longitude: -9.1393,
  longitudeDelta: 0.06,
};

const MAP_CENTER_ANIMATION_MS = 360;
const TOP_NAV_OFFSET = 8;
const TOP_NAV_HEIGHT = 44;
const PREVIEW_TOP_GAP = 16;
const BOTTOM_NAV_HEIGHT = 64;
const BOTTOM_NAV_GAP = 12;
const PREVIEW_HORIZONTAL_PADDING = 20;
const PREVIEW_MAX_WIDTH = 380;
const LOCATION_CENTER_ANIMATION_MS = 700;

let hasAutoCenteredOnUserThisSession = false;
let sessionLocationStatus = "idle";
let sessionUserLocation = null;

const MONOCHROME_MAP_STYLE = [
  {
    elementType: "geometry",
    stylers: [{ color: "#f4f4f4" }],
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#202020" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#f1f1f1" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d7d7d7" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6f6f6f" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cfcfcf" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#d9dede" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#767676" }],
  },
];

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

function LocationStatusIndicator({ onPress, status, top }) {
  const isAvailable = status === "available";
  const isLocating = status === "locating";

  return (
    <Pressable
      accessibilityHint="Centers the map on your current location"
      accessibilityLabel="Recenter map to your location"
      accessibilityRole="button"
      accessibilityState={{ disabled: isLocating }}
      disabled={isLocating}
      onPress={onPress}
      style={[
        styles.locationStatus,
        isAvailable && styles.locationStatusAvailable,
        isLocating && styles.locationStatusDisabled,
        { top },
      ]}
    >
      <Ionicons
        name={isLocating ? "radio-outline" : "location"}
        size={14}
        color={isAvailable ? colors.surface : colors.iconMuted}
      />
      <Text
        style={[
          styles.locationStatusText,
          isAvailable && styles.locationStatusTextAvailable,
        ]}
      >
        {getLocationStatusLabel(status)}
      </Text>
    </Pressable>
  );
}

export default function MapScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const isMapReadyRef = useRef(false);
  const currentRegionRef = useRef(LISBON_REGION);
  const pendingInitialLocationRegionRef = useRef(null);
  const previewAnimation = useRef(new Animated.Value(0)).current;
  const [events, setEvents] = useState([]);
  const [locationStatus, setLocationStatus] = useState(
    sessionLocationStatus === "idle" ? "locating" : sessionLocationStatus,
  );
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userLocation, setUserLocation] = useState(sessionUserLocation);
  const {
    deactivateDiscoveryMode,
    filterDiscoveryEvents,
    isDiscoveryActive,
  } = useDiscoveryMode();
  useInteractionLogger(LOG_ACTIONS.mapViewOpened, {
    screen: "MapScreen",
  });

  const previewOpacity = previewAnimation;
  const previewScale = previewAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });
  const previewTranslateY = previewAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });
  const previewBounds = {
    bottom: Math.max(insets.bottom, 12) + BOTTOM_NAV_HEIGHT + BOTTOM_NAV_GAP,
    top: insets.top + TOP_NAV_OFFSET + TOP_NAV_HEIGHT + PREVIEW_TOP_GAP,
  };

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
        longitudeDelta:
          currentRegion.longitudeDelta || LISBON_REGION.longitudeDelta,
      };

      centerMapOnRegion(nextRegion, duration);
    },
    [centerMapOnRegion],
  );

  const applyLocationResult = useCallback((result, shouldCenter) => {
    if (result.status === "available" && result.coordinate) {
      sessionUserLocation = result.coordinate;
      sessionLocationStatus = "available";
      setUserLocation(result.coordinate);
      setLocationStatus("available");

      if (shouldCenter) {
        centerMapOnCoordinate(result.coordinate);
      }

      return;
    }

    sessionLocationStatus =
      result.status === "denied" ? "denied" : "unavailable";
    setLocationStatus(sessionLocationStatus);
  }, [centerMapOnCoordinate]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getEvents().then((nextEvents) => {
        if (isActive) {
          setEvents(filterDiscoveryEvents(nextEvents));
        }
      });

      return () => {
        isActive = false;
        previewAnimation.setValue(0);
        setSelectedEvent(null);
      };
    }, [filterDiscoveryEvents, previewAnimation]),
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      if (hasAutoCenteredOnUserThisSession) {
        if (sessionUserLocation) {
          setUserLocation(sessionUserLocation);
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

          sessionLocationStatus =
            result.status === "denied" ? "denied" : "unavailable";
          return;
        }

        applyLocationResult(result, true);
      });

      return () => {
        isActive = false;
      };
    }, [applyLocationResult, pathname]),
  );

  const closePreview = useCallback((reason) => {
    if (selectedEvent && reason) {
      logInteraction(LOG_ACTIONS.eventPreviewDismissed, {
        eventId: selectedEvent.id,
        reason,
        route: pathname,
        screen: "MapScreen",
      }).catch(() => null);
    }

    previewAnimation.setValue(0);
    setSelectedEvent(null);
  }, [pathname, previewAnimation, selectedEvent]);

  const animatePreviewIn = useCallback(() => {
    previewAnimation.setValue(0);
    Animated.spring(previewAnimation, {
      damping: 18,
      mass: 0.75,
      stiffness: 190,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [previewAnimation]);

  const handleRegionChangeComplete = useCallback((region) => {
    currentRegionRef.current = region;
  }, []);

  const handleMapReady = useCallback(() => {
    isMapReadyRef.current = true;

    if (pendingInitialLocationRegionRef.current) {
      mapRef.current?.animateToRegion(
        pendingInitialLocationRegionRef.current,
        LOCATION_CENTER_ANIMATION_MS,
      );
      pendingInitialLocationRegionRef.current = null;
    }
  }, []);

  const handleMapPress = useCallback(() => {
    if (selectedEvent) {
      closePreview("map_press");
    }
  }, [closePreview, selectedEvent]);

  const handleMapPanDrag = useCallback(() => {
    if (selectedEvent) {
      closePreview("map_pan");
    }
  }, [closePreview, selectedEvent]);

  const handlePinPress = useCallback(
    (event) => {
      const currentRegion = currentRegionRef.current || LISBON_REGION;

      setSelectedEvent(event);
      animatePreviewIn();

      mapRef.current?.animateToRegion(
        {
          latitude: event.latitude,
          latitudeDelta: currentRegion.latitudeDelta || LISBON_REGION.latitudeDelta,
          longitude: event.longitude,
          longitudeDelta:
            currentRegion.longitudeDelta || LISBON_REGION.longitudeDelta,
        },
        MAP_CENTER_ANIMATION_MS,
      );

      logInteraction(LOG_ACTIONS.eventPinSelected, {
        eventId: event.id,
        route: pathname,
        screen: "MapScreen",
        source: "map_pin",
      }).catch(() => null);
    },
    [animatePreviewIn, pathname],
  );

  const handleMarkerPress = useCallback(
    (markerEvent, event) => {
      markerEvent?.stopPropagation?.();
      handlePinPress(event);
    },
    [handlePinPress],
  );

  const openSelectedEvent = useCallback(() => {
    if (!selectedEvent) return;

    const eventId = selectedEvent.id;
    closePreview("open_detail");
    router.push({
      pathname: "/event/[id]",
      params: { id: eventId },
    });
  }, [closePreview, router, selectedEvent]);

  const handlePreviewSavedChange = useCallback((updatedEvent) => {
    setSelectedEvent(updatedEvent);
    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event,
      ),
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
    logInteraction(LOG_ACTIONS.userLocationRecentered, {
      route: pathname,
      screen: "MapScreen",
      source: "location_status_indicator",
    }).catch(() => null);

    if (userLocation) {
      centerMapOnCoordinate(userLocation);
      return;
    }

    sessionLocationStatus = "locating";
    setLocationStatus("locating");

    getForegroundUserLocation({
      route: pathname,
      screen: "MapScreen",
      source: "location_status_indicator",
    }).then((result) => {
      applyLocationResult(result, true);
    });
  }, [applyLocationResult, centerMapOnCoordinate, pathname, userLocation]);

  return (
    <View style={styles.container}>
      <MapView
        customMapStyle={MONOCHROME_MAP_STYLE}
        initialRegion={LISBON_REGION}
        loadingBackgroundColor="#f4f4f4"
        loadingEnabled
        loadingIndicatorColor="#111111"
        mapType="standard"
        onMapReady={handleMapReady}
        onPanDrag={handleMapPanDrag}
        onPress={handleMapPress}
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
        {events.map((event) => (
          <Marker
            anchor={{ x: 0.5, y: 1 }}
            coordinate={{ latitude: event.latitude, longitude: event.longitude }}
            key={`${event.id}-${isDiscoveryActive ? "discover" : "normal"}`}
            onPress={(markerEvent) => handleMarkerPress(markerEvent, event)}
            tracksViewChanges={isDiscoveryActive}
          >
            <EventPin event={event} isDiscoverMode={isDiscoveryActive} />
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
            zIndex={1000}
          >
            <CurrentLocationMarker />
          </Marker>
        )}
      </MapView>

      <LocationStatusIndicator
        onPress={handleLocationStatusPress}
        status={locationStatus}
        top={insets.top + 64}
      />

      {isDiscoveryActive && (
        <>
          <View pointerEvents="none" style={styles.discoverBorder} />
          <DiscoverModePill
            onPress={handleDiscoverDismiss}
            style={[styles.discoverPill, { top: insets.top + 62 }]}
          />
        </>
      )}

      {selectedEvent && (
        <>
          <Animated.View
            style={[styles.blurLayer, { opacity: previewOpacity }]}
          >
            <Pressable
              accessibilityLabel="Close event preview"
              accessibilityRole="button"
              onPress={() => closePreview("overlay_tap")}
              style={styles.dismissLayer}
            >
              <BlurView
                experimentalBlurMethod={
                  Platform.OS === "android" ? "dimezisBlurView" : undefined
                }
                intensity={24}
                pointerEvents="none"
                style={styles.blurSurface}
                tint="light"
              />
            </Pressable>
          </Animated.View>

          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.previewLayer,
              previewBounds,
              {
                opacity: previewOpacity,
                transform: [
                  { translateY: previewTranslateY },
                  { scale: previewScale },
                ],
              },
            ]}
          >
            <View
              onStartShouldSetResponder={() => true}
              style={styles.previewCard}
            >
              <EventCard
                event={selectedEvent}
                key={selectedEvent.id}
                onSavedChange={handlePreviewSavedChange}
                onOpen={openSelectedEvent}
                screen="MapScreen"
                source="map_preview"
              />
            </View>
          </Animated.View>
        </>
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
  locationStatus: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    borderColor: "rgba(255, 255, 255, 0.62)",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 5,
    flexDirection: "row",
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 10,
    position: "absolute",
    right: 18,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    zIndex: 1,
  },
  locationStatusAvailable: {
    backgroundColor: colors.primary,
    borderColor: "rgba(255, 255, 255, 0.72)",
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
  locationStatusTextAvailable: {
    color: colors.surface,
  },
  userLocationMarker: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    overflow: "visible",
    width: 42,
  },
  userLocationPulse: {
    backgroundColor: "rgba(57, 245, 122, 0.28)",
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
    shadowColor: "#000000",
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
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  dismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  blurSurface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  previewLayer: {
    alignItems: "center",
    justifyContent: "center",
    left: 0,
    paddingHorizontal: PREVIEW_HORIZONTAL_PADDING,
    position: "absolute",
    right: 0,
    zIndex: 2,
  },
  previewCard: {
    maxWidth: PREVIEW_MAX_WIDTH,
    width: "100%",
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
});
