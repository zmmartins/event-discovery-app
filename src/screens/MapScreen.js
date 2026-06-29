import { Ionicons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
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
import { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DiscoverModePill from "../components/DiscoverModePill";
import EventPin, {
  getEventPinMarkerAnchor,
  getSessionEventPinLayout,
} from "../components/EventPin";
import EventPinActionMenu, {
  getEventPinActionLayout,
  getHoveredPinAction,
} from "../components/EventPinActionMenu";
import MorphingEventPreview from "../components/MorphingEventPreview";
import MorphingPreviewBackdrop from "../components/MorphingPreviewBackdrop";
import { useDiscoveryMode } from "../context/DiscoveryModeContext";
import useInteractionLogger from "../hooks/useInteractionLogger";
import { getEvents, toggleSavedEvent } from "../services/eventService";
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
const PREVIEW_POSTER_BOTTOM_PADDING = 5;
const PREVIEW_HEADER_HEIGHT = 140;
const PREVIEW_IMAGE_GAP = 14;
const PREVIEW_BOTTOM_GAP = 14;
const PREVIEW_META_HEIGHT = 66;
const PREVIEW_BASE_CARD_HEIGHT = 520;
const PREVIEW_MAX_CARD_HEIGHT = 680;

const LOCATION_CENTER_ANIMATION_MS = 700;
const EVENT_CENTER_ANIMATION_MS = 220;
const EVENT_PREVIEW_FALLBACK_DELAY_MS = EVENT_CENTER_ANIMATION_MS + 140;
const EVENT_CENTER_TOLERANCE_METERS = 30;
const USER_CENTER_TOLERANCE_METERS = 80;
const PIN_ACTION_LONG_PRESS_MS = 360;
const PIN_ACTION_MENU_DISMISS_MS = 160;
const PIN_ACTION_TOUCH_TARGET_EXTRA_SIZE = 18;

// Calibration between the native Google Maps custom marker snapshot and the
// React Native morph overlay. Value is in React Native layout points.
// Negative Y moves the morph origin upward.
const PREVIEW_ORIGIN_OFFSET_X = 0;
const PREVIEW_ORIGIN_OFFSET_Y = Platform.select({
  ios: -16,
  android: -16, // test on Android device/emulator; adjust if needed
  default: -16,
});

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

  return clamp(estimatedHeight, PREVIEW_BASE_CARD_HEIGHT, PREVIEW_MAX_CARD_HEIGHT);
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
  const top = Math.max(PREVIEW_HORIZONTAL_PADDING, (screenHeight - cardHeight) / 2);

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
    cloneLeft: startPoint.x + PREVIEW_ORIGIN_OFFSET_X - pinLayout.outerSize / 2,
    cloneTop: startPoint.y + PREVIEW_ORIGIN_OFFSET_Y - pinLayout.outerSize / 2,
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
  const shouldUseLiquidGlass = Platform.OS === "ios" && liquidGlassAvailable && !isActive;

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
        color={isActive ? colors.text : colors.iconMuted}
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
      {shouldUseLiquidGlass ? (
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

function getPrimaryTouch(nativeEvent) {
  return nativeEvent.touches?.[0] ?? nativeEvent.changedTouches?.[0] ?? nativeEvent;
}

function getContainerTouchPoint(responderEvent, containerOffset) {
  const touch = getPrimaryTouch(responderEvent.nativeEvent);

  return {
    x: touch.pageX - containerOffset.x,
    y: touch.pageY - containerOffset.y,
  };
}

function getEventCoordinate(event) {
  return {
    latitude: event.latitude,
    longitude: event.longitude,
  };
}

function getValidScreenPoint(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;

  return {
    x: point.x,
    y: point.y,
  };
}

export default function MapScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const previewProgress = useSharedValue(0);

  const mapContainerRef = useRef(null);
  const mapContainerOffsetRef = useRef({ x: 0, y: 0 });
  const mapRef = useRef(null);
  const isMapReadyRef = useRef(false);
  const isRecenteringOnUserRef = useRef(false);
  const currentRegionRef = useRef(LISBON_REGION);
  const morphPreviewRef = useRef(null);
  const pendingInitialLocationRegionRef = useRef(null);
  const pendingPreviewEventRef = useRef(null);
  const eventCenterTimeoutRef = useRef(null);
  const previewOpenRequestIdRef = useRef(0);
  const pinActionDismissTimeoutRef = useRef(null);
  const pinActionGestureRef = useRef(null);
  const pinActionMenuRef = useRef(null);
  const pinTouchPointRefreshIdRef = useRef(0);
  const suppressPinPressRef = useRef(null);
  const isRecenteringOnEventRef = useRef(false);
  const hasDismissedPreviewByGestureRef = useRef(false);

  const [events, setEvents] = useState([]);
  const [loadedPinImages, setLoadedPinImages] = useState({});
  const [locationStatus, setLocationStatus] = useState(
    sessionLocationStatus === "idle" ? "locating" : sessionLocationStatus
  );
  const [isMapCenteredOnUser, setIsMapCenteredOnUser] = useState(false);
  const [mapLayout, setMapLayout] = useState({
    height: screenHeight,
    width: screenWidth,
  });
  const [hoveredPinAction, setHoveredPinAction] = useState(null);
  const [eventPinTouchPoints, setEventPinTouchPoints] = useState({});
  const [pinActionMenu, setPinActionMenu] = useState(null);
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

      if (pinActionDismissTimeoutRef.current) {
        clearTimeout(pinActionDismissTimeoutRef.current);
        pinActionDismissTimeoutRef.current = null;
      }

      pinActionGestureRef.current = null;
      pinActionMenuRef.current = null;
      pinTouchPointRefreshIdRef.current += 1;
      previewOpenRequestIdRef.current += 1;
      suppressPinPressRef.current = null;
    };
  }, []);

  const handlePinImageLoad = useCallback((eventId) => {
    requestAnimationFrame(() => {
      setLoadedPinImages((currentLoadedPinImages) => {
        if (currentLoadedPinImages[eventId]) {
          return currentLoadedPinImages;
        }

        return {
          ...currentLoadedPinImages,
          [eventId]: true,
        };
      });
    });
  }, []);

  const cancelPendingEventPreview = useCallback(() => {
    pendingPreviewEventRef.current = null;
    isRecenteringOnEventRef.current = false;
    previewOpenRequestIdRef.current += 1;

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

          setLoadedPinImages({});
          setEvents(filteredEvents);
        }
      });

      return () => {
        isActive = false;
        cancelPendingEventPreview();
        if (pinActionDismissTimeoutRef.current) {
          clearTimeout(pinActionDismissTimeoutRef.current);
          pinActionDismissTimeoutRef.current = null;
        }
        setHoveredPinAction(null);
        setEventPinTouchPoints({});
        pinActionGestureRef.current = null;
        pinActionMenuRef.current = null;
        pinTouchPointRefreshIdRef.current += 1;
        suppressPinPressRef.current = null;
        setPinActionMenu(null);
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

  const handleMapLayout = useCallback((layoutEvent) => {
    const { height, width } = layoutEvent.nativeEvent.layout;

    if (height <= 0 || width <= 0) return;

    mapContainerRef.current?.measureInWindow?.((x, y) => {
      mapContainerOffsetRef.current = { x, y };
    });

    setMapLayout((currentLayout) => {
      if (currentLayout.height === height && currentLayout.width === width) {
        return currentLayout;
      }

      return { height, width };
    });
  }, []);

  const getViewportDimensions = useCallback(
    () => ({
      height: mapLayout.height || screenHeight,
      width: mapLayout.width || screenWidth,
    }),
    [mapLayout.height, mapLayout.width, screenHeight, screenWidth]
  );

  const getViewportCenterPoint = useCallback(() => {
    const { height, width } = getViewportDimensions();

    return {
      x: width / 2,
      y: height / 2,
    };
  }, [getViewportDimensions]);

  const refreshEventPinTouchPoints = useCallback(() => {
    const map = mapRef.current;

    if (!isMapReadyRef.current || !map || events.length === 0) {
      setEventPinTouchPoints({});
      return;
    }

    const refreshId = pinTouchPointRefreshIdRef.current + 1;
    pinTouchPointRefreshIdRef.current = refreshId;

    Promise.all(
      events.map(async (event) => {
        try {
          const point = await map.pointForCoordinate(getEventCoordinate(event));
          const screenPoint = getValidScreenPoint(point);

          return screenPoint ? [event.id, screenPoint] : null;
        } catch {
          return null;
        }
      })
    ).then((entries) => {
      if (pinTouchPointRefreshIdRef.current !== refreshId) return;

      const nextTouchPoints = entries.reduce((points, entry) => {
        if (!entry) return points;

        const [eventId, point] = entry;

        return {
          ...points,
          [eventId]: point,
        };
      }, {});

      setEventPinTouchPoints(nextTouchPoints);
    });
  }, [events]);

  useEffect(() => {
    refreshEventPinTouchPoints();
  }, [mapLayout.height, mapLayout.width, refreshEventPinTouchPoints]);

  const dismissPinActionMenu = useCallback(
    (reason = "dismissed", { logDismiss = true } = {}) => {
      const currentMenu = pinActionMenuRef.current;

      if (!currentMenu) return;

      if (pinActionDismissTimeoutRef.current) {
        clearTimeout(pinActionDismissTimeoutRef.current);
        pinActionDismissTimeoutRef.current = null;
      }

      setHoveredPinAction(null);
      const nextMenu = {
        ...currentMenu,
        visible: false,
      };

      pinActionMenuRef.current = nextMenu;
      setPinActionMenu(nextMenu);

      if (logDismiss) {
        logInteraction(LOG_ACTIONS.eventPinActionMenuDismissed, {
          eventId: currentMenu.event.id,
          reason,
          result: "dismissed",
          route: pathname,
          screen: "MapScreen",
          source: "pin_action_menu",
        }).catch(() => null);
      }

      pinActionDismissTimeoutRef.current = setTimeout(() => {
        pinActionMenuRef.current = null;
        setPinActionMenu(null);
        pinActionDismissTimeoutRef.current = null;
      }, PIN_ACTION_MENU_DISMISS_MS);
    },
    [pathname]
  );

  const openPinActionMenu = useCallback(
    (event, origin) => {
      const safeOrigin = getValidScreenPoint(origin);

      if (!safeOrigin) return null;

      const { height, width } = getViewportDimensions();
      const layout = getEventPinActionLayout({
        origin: safeOrigin,
        otherPinPoints: [],
        screenHeight: height,
        screenWidth: width,
      });

      cancelPendingEventPreview();

      if (selectedEvent) {
        closePreview("pin_action_menu");
      }

      if (pinActionDismissTimeoutRef.current) {
        clearTimeout(pinActionDismissTimeoutRef.current);
        pinActionDismissTimeoutRef.current = null;
      }

      setHoveredPinAction(null);
      const nextMenu = {
        event,
        layout,
        origin: safeOrigin,
        visible: true,
      };

      pinActionMenuRef.current = nextMenu;
      setPinActionMenu(nextMenu);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
      logInteraction(LOG_ACTIONS.eventPinActionMenuOpened, {
        eventId: event.id,
        route: pathname,
        screen: "MapScreen",
        source: "map_pin_long_press",
      }).catch(() => null);

      return layout;
    },
    [
      cancelPendingEventPreview,
      closePreview,
      getViewportDimensions,
      pathname,
      selectedEvent,
    ]
  );

  const handlePinActionHoverChange = useCallback((nextAction) => {
    setHoveredPinAction((currentAction) => {
      if (currentAction === nextAction) return currentAction;

      if (nextAction) {
        Haptics.selectionAsync().catch(() => null);
      }

      return nextAction;
    });
  }, []);

  const openPreviewForEvent = useCallback(
    (event) => {
      const { height: viewportHeight, width: viewportWidth } = getViewportDimensions();
      const startPoint = getViewportCenterPoint();

      const pinLayout = getSessionEventPinLayout(event);
      const nextPreviewGeometry = getPreviewGeometry({
        event,
        pinLayout,
        screenHeight: viewportHeight,
        screenWidth: viewportWidth,
        startPoint,
      });

      hasDismissedPreviewByGestureRef.current = false;
      setPreviewGeometry(nextPreviewGeometry);
      setSelectedEvent(event);
      setIsMapCenteredOnUser(
        isRegionCenteredOnCoordinate(currentRegionRef.current, userLocation)
      );
    },
    [getViewportCenterPoint, getViewportDimensions, userLocation]
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
          refreshEventPinTouchPoints();
          openPreviewForEvent(pendingPreviewEvent);
          return;
        }
      }

      refreshEventPinTouchPoints();
      const isCenteredOnUser = isRegionCenteredOnCoordinate(region, userLocation);

      if (isCenteredOnUser) {
        isRecenteringOnUserRef.current = false;
        setIsMapCenteredOnUser(true);
      } else if (!isRecenteringOnUserRef.current && !isRecenteringOnEventRef.current) {
        setIsMapCenteredOnUser(false);
      }
    },
    [openPreviewForEvent, refreshEventPinTouchPoints, userLocation]
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

    refreshEventPinTouchPoints();
  }, [refreshEventPinTouchPoints]);

  const handleMapPress = useCallback(() => {
    cancelPendingEventPreview();
    dismissPinActionMenu("map_press");

    if (selectedEvent) {
      closePreview("map_press");
    }
  }, [cancelPendingEventPreview, closePreview, dismissPinActionMenu, selectedEvent]);

  const handleMapPanDrag = useCallback(() => {
    cancelPendingEventPreview();
    dismissPinActionMenu("map_pan");
    isRecenteringOnUserRef.current = false;
    setIsMapCenteredOnUser(false);

    if (selectedEvent) {
      closePreview("map_pan");
    }
  }, [cancelPendingEventPreview, closePreview, dismissPinActionMenu, selectedEvent]);

  const handlePinPress = useCallback(
    (event) => {
      dismissPinActionMenu("pin_tap", { logDismiss: false });
      previewOpenRequestIdRef.current += 1;
      const previewRequestId = previewOpenRequestIdRef.current;
      const coordinate = getEventCoordinate(event);

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

          if (previewOpenRequestIdRef.current === previewRequestId) {
            openPreviewForEvent(pendingEvent);
          }
        }
      }, EVENT_PREVIEW_FALLBACK_DELAY_MS);

      logInteraction(LOG_ACTIONS.eventPinSelected, {
        eventId: event.id,
        route: pathname,
        screen: "MapScreen",
        source: "map_pin",
      }).catch(() => null);
    },
    [dismissPinActionMenu, openPreviewForEvent, pathname, selectedEvent]
  );

  const handlePinActionSelect = useCallback(
    async (event, action, reason = "release_outside") => {
      if (!action) {
        dismissPinActionMenu(reason);
        return;
      }

      dismissPinActionMenu(`selected_${action}`, { logDismiss: false });
      Haptics.selectionAsync().catch(() => null);
      logInteraction(LOG_ACTIONS.eventPinActionMenuSelected, {
        eventId: event.id,
        result: action,
        route: pathname,
        screen: "MapScreen",
        source: "pin_action_menu",
      }).catch(() => null);

      if (action === "expand") {
        handlePinPress(event);
        return;
      }

      if (action === "share") {
        logInteraction(LOG_ACTIONS.eventShared, {
          eventId: event.id,
          reason: "share_not_implemented",
          result: "placeholder",
          route: pathname,
          screen: "MapScreen",
          source: "pin_action_menu",
        }).catch(() => null);
        return;
      }

      if (action === "save") {
        try {
          const updatedEvent = await toggleSavedEvent(event.id);

          if (!updatedEvent) return;

          setEvents((currentEvents) =>
            currentEvents.map((currentEvent) =>
              currentEvent.id === updatedEvent.id ? updatedEvent : currentEvent
            )
          );
          setSelectedEvent((currentSelectedEvent) =>
            currentSelectedEvent?.id === updatedEvent.id
              ? updatedEvent
              : currentSelectedEvent
          );
          logInteraction(LOG_ACTIONS.eventBookmarkToggled, {
            eventId: event.id,
            isSaved: Boolean(updatedEvent.isSaved),
            route: pathname,
            screen: "MapScreen",
            source: "pin_action_menu",
          }).catch(() => null);
        } catch {
          logInteraction(LOG_ACTIONS.eventBookmarkToggled, {
            eventId: event.id,
            reason: "toggle_failed",
            result: "failed",
            route: pathname,
            screen: "MapScreen",
            source: "pin_action_menu",
          }).catch(() => null);
        }
      }
    },
    [dismissPinActionMenu, handlePinPress, pathname]
  );

  const handleMarkerPress = useCallback(
    (markerEvent, event) => {
      markerEvent?.stopPropagation?.();
      handlePinPress(event);
    },
    [handlePinPress]
  );

  const handlePinTouchPress = useCallback(
    (event) => {
      if (suppressPinPressRef.current === event.id) {
        suppressPinPressRef.current = null;
        return;
      }

      if (pinActionGestureRef.current?.event?.id === event.id) return;

      handlePinPress(event);
    },
    [handlePinPress]
  );

  const handlePinTouchLongPress = useCallback(
    (event, origin) => {
      suppressPinPressRef.current = event.id;

      const layout = openPinActionMenu(event, origin);

      if (!layout) return;

      pinActionGestureRef.current = {
        event,
        hoveredAction: null,
        layout,
      };
    },
    [openPinActionMenu]
  );

  const handlePinTouchMove = useCallback(
    (responderEvent, event) => {
      const currentGesture = pinActionGestureRef.current;

      if (currentGesture?.event?.id !== event.id) return;

      const point = getContainerTouchPoint(responderEvent, mapContainerOffsetRef.current);
      const nextHoveredAction = getHoveredPinAction(point, currentGesture.layout);

      if (nextHoveredAction === currentGesture.hoveredAction) return;

      currentGesture.hoveredAction = nextHoveredAction;
      handlePinActionHoverChange(nextHoveredAction);
    },
    [handlePinActionHoverChange]
  );

  const handlePinTouchPressOut = useCallback(
    (responderEvent, event) => {
      const currentGesture = pinActionGestureRef.current;

      if (currentGesture?.event?.id !== event.id) return;

      const releasePoint = getContainerTouchPoint(
        responderEvent,
        mapContainerOffsetRef.current
      );
      const selectedAction = getHoveredPinAction(releasePoint, currentGesture.layout);

      pinActionGestureRef.current = null;
      handlePinActionSelect(event, selectedAction);

      requestAnimationFrame(() => {
        if (suppressPinPressRef.current === event.id) {
          suppressPinPressRef.current = null;
        }
      });
    },
    [handlePinActionSelect]
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

  const shouldShowLocationStatus = !(selectedEvent && previewGeometry);
  const { height: viewportHeight, width: viewportWidth } = getViewportDimensions();
  const pinPressRetentionOffset = {
    bottom: viewportHeight,
    left: viewportWidth,
    right: viewportWidth,
    top: viewportHeight,
  };

  return (
    <View ref={mapContainerRef} onLayout={handleMapLayout} style={styles.container}>
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
        {events.map((event) => {
          const hasLoadedPinImage = Boolean(loadedPinImages[event.id]);

          return (
            <Marker
              anchor={getEventPinMarkerAnchor(event)}
              coordinate={getEventCoordinate(event)}
              key={event.id}
              onPress={(markerEvent) => handleMarkerPress(markerEvent, event)}
              tracksViewChanges={!hasLoadedPinImage}
              zIndex={getEventPinZIndex(event)}
            >
              <View collapsable={false}>
                <EventPin
                  event={event}
                  onImageLoad={() => handlePinImageLoad(event.id)}
                />
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
            tracksViewChanges={false}
            zIndex={20000}
          >
            <CurrentLocationMarker />
          </Marker>
        )}
      </MapView>

      <View pointerEvents="box-none" style={styles.eventPinTouchLayer}>
        {events.map((event) => {
          const origin = eventPinTouchPoints[event.id];

          if (!origin) return null;

          const pinLayout = getSessionEventPinLayout(event);
          const touchSize = pinLayout.outerSize + PIN_ACTION_TOUCH_TARGET_EXTRA_SIZE;

          return (
            <Pressable
              accessibilityLabel={`${event.title ?? "Event"} map pin`}
              accessibilityRole="button"
              delayLongPress={PIN_ACTION_LONG_PRESS_MS}
              key={`pin-touch-${event.id}`}
              onLongPress={() => handlePinTouchLongPress(event, origin)}
              onPress={() => handlePinTouchPress(event)}
              onPressMove={(responderEvent) => handlePinTouchMove(responderEvent, event)}
              onPressOut={(responderEvent) =>
                handlePinTouchPressOut(responderEvent, event)
              }
              pressRetentionOffset={pinPressRetentionOffset}
              style={[
                styles.eventPinTouchTarget,
                {
                  borderRadius: touchSize / 2,
                  height: touchSize,
                  left: origin.x - touchSize / 2,
                  top: origin.y - touchSize / 2,
                  width: touchSize,
                  zIndex: getEventPinZIndex(event),
                },
              ]}
            />
          );
        })}
      </View>

      {selectedEvent && previewGeometry && (
        <MorphingPreviewBackdrop
          onPress={() => dismissPreviewFromOverlayGesture("map_press")}
          onTouchMove={() => dismissPreviewFromOverlayGesture("map_pan")}
          progressValue={previewProgress}
        />
      )}

      {pinActionMenu && (
        <EventPinActionMenu
          event={pinActionMenu.event}
          hoveredAction={hoveredPinAction}
          origin={pinActionMenu.origin}
          screenHeight={viewportHeight}
          screenWidth={viewportWidth}
          visible={pinActionMenu.visible}
        />
      )}

      {shouldShowLocationStatus && (
        <LocationStatusIndicator
          isCenteredOnUser={isMapCenteredOnUser}
          onPress={handleLocationStatusPress}
          status={locationStatus}
          top={insets.top + 64}
        />
      )}

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
          progressValue={previewProgress}
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
  eventPinTouchLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  eventPinTouchTarget: {
    backgroundColor: "transparent",
    position: "absolute",
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    opacity: 1,
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
