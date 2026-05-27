import { BlurView } from "expo-blur";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EventCard from "../components/EventCard";
import EventPin from "../components/EventPin";
import useInteractionLogger from "../hooks/useInteractionLogger";
import { getEvents } from "../services/eventService";
import {
  LOG_ACTIONS,
  logInteraction,
} from "../services/interactionLogService";

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

export default function MapScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const currentRegionRef = useRef(LISBON_REGION);
  const previewAnimation = useRef(new Animated.Value(0)).current;
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
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

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getEvents().then((nextEvents) => {
        if (isActive) {
          setEvents(nextEvents);
        }
      });

      return () => {
        isActive = false;
        previewAnimation.setValue(0);
        setSelectedEvent(null);
      };
    }, [previewAnimation]),
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

  return (
    <View style={styles.container}>
      <MapView
        customMapStyle={MONOCHROME_MAP_STYLE}
        initialRegion={LISBON_REGION}
        loadingBackgroundColor="#f4f4f4"
        loadingEnabled
        loadingIndicatorColor="#111111"
        mapType="standard"
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
            key={event.id}
            onPress={(markerEvent) => handleMarkerPress(markerEvent, event)}
            tracksViewChanges={false}
          >
            <EventPin event={event} />
          </Marker>
        ))}
      </MapView>

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
});
