import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EventCard from "../components/EventCard";
import EventPin, { getEventPinMarkerAnchor } from "../components/EventPin";
import ExperiencePin from "../components/ExperiencePin";
import ProfileExperienceCard from "../components/ProfileExperienceCard";
import useInteractionLogger from "../hooks/useInteractionLogger";
import { LOG_ACTIONS, logInteraction } from "../services/interactionLogService";
import { getCurrentUserProfile } from "../services/profileService";
import { colors } from "../theme/colors";
import { APP_MAP_STYLE } from "../theme/mapStyle";
import { getAvatarImage } from "../utils/imageAssets";

const DEFAULT_REGION = {
  latitude: 38.7223,
  latitudeDelta: 0.06,
  longitude: -9.1393,
  longitudeDelta: 0.06,
};

const PROFILE_SECTIONS = [
  { id: "attended", label: "Attended" },
  { id: "going", label: "Going" },
  { id: "saved", label: "Saved" },
];
const PROFILE_VIEWS = [
  { icon: "list", label: "List", value: "list" },
  { icon: "map", label: "Map", value: "map" },
];
const USERNAME_NOTCH_HEIGHT = 38;
const USERNAME_NOTCH_GAP = 10;
const PROFILE_TONGUE_TOP_GAP = 8;
const SHEET_COLLAPSED_SUMMARY_EXTRA_PADDING = 60;
const SHEET_COLLAPSED_FALLBACK_VISIBLE_HEIGHT = 220;
const BOTTOM_NAV_COLLAPSED_OVERLAP = 18;
const SHEET_CORNER_RADIUS = 34;
const SHEET_SCREEN_MARGIN = 10;
const SHEET_TOP_EXTENSION = 80;
const SHEET_HORIZONTAL_PADDING = 22;
const BOTTOM_NAV_RESERVED_HEIGHT = 122;
const PROFILE_MAP_BOTTOM_NAV_HEIGHT = 64;
const PROFILE_MAP_BOTTOM_GAP = 8;
const SHEET_EXTRA_BOTTOM_PADDING = 180;
const PROFILE_COLUMN_GAP = 12;
const PROFILE_ITEM_GAP = 22;
const PROFILE_NAME_LEFT_INSET = 8;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isMostlyVerticalGesture(gestureState) {
  return (
    Math.abs(gestureState.dy) > 8 &&
    Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.25
  );
}

function getProfileRegion(pins) {
  if (!pins?.length) return DEFAULT_REGION;

  const latitudes = pins.map((pin) => pin.latitude);
  const longitudes = pins.map((pin) => pin.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    latitudeDelta: Math.max(maxLatitude - minLatitude + 0.035, 0.045),
    longitude: (minLongitude + maxLongitude) / 2,
    longitudeDelta: Math.max(maxLongitude - minLongitude + 0.035, 0.045),
  };
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

function ProfileSummary({ onLayout, profile }) {
  const displayNameParts = String(profile.name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const safeDisplayNameParts =
    displayNameParts.length > 0 ? displayNameParts : [profile.username].filter(Boolean);

  return (
    <View onLayout={onLayout} style={styles.summary}>
      <View style={styles.summaryTopRow}>
        <View style={styles.nameBlock}>
          <View style={styles.profileNameStack}>
            {safeDisplayNameParts.map((namePart, index) => (
              <Text key={`${namePart}-${index}`} style={styles.profileNameLine}>
                {namePart}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.statsStack}>
          <Stat label="Friends" value={profile.stats.friends} />
          <Stat label="Attended" value={profile.stats.attendedEvents} />
          <Stat label="Unique" value={profile.stats.uniqueExperiences} />
        </View>
      </View>

      {!!profile.description && (
        <Text numberOfLines={3} style={styles.profileDescription}>
          {profile.description}
        </Text>
      )}
    </View>
  );
}

function ProfileSectionTabs({ activeSection, onChange, profile }) {
  return (
    <View style={styles.sectionTabs}>
      {PROFILE_SECTIONS.map((section) => {
        const isActive = activeSection === section.id;
        const count = profile.sections?.[section.id]?.count ?? 0;

        return (
          <Pressable
            accessibilityLabel={`Show ${section.label} profile section`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            key={section.id}
            onPress={() => onChange(section.id)}
            style={({ pressed }) => [
              styles.sectionTab,
              isActive && styles.sectionTabActive,
              pressed && styles.pressed,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.sectionTabLabel, isActive && styles.sectionTabLabelActive]}
            >
              {section.label}
            </Text>
            <Text
              style={[styles.sectionTabCount, isActive && styles.sectionTabCountActive]}
            >
              ({count})
            </Text>
            <View
              pointerEvents="none"
              style={[
                styles.sectionTabIndicator,
                isActive && styles.sectionTabIndicatorActive,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function ProfileViewSelector({ activeView, onChange }) {
  return (
    <View style={styles.viewSelector}>
      {PROFILE_VIEWS.map((option) => {
        const isActive = activeView === option.value;

        return (
          <Pressable
            accessibilityLabel={`Show ${option.label.toLowerCase()} view`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.viewSelectorButton,
              isActive && styles.viewSelectorButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={option.icon}
              size={18}
              color={isActive ? colors.iconActive : colors.iconMuted}
            />
            <Text
              style={[styles.viewSelectorText, isActive && styles.viewSelectorTextActive]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ProfileEmptyState({ body, title }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateBody}>{body}</Text>
    </View>
  );
}

function MasonryEventList({
  columnWidth,
  events,
  onOpenEvent,
  onSavedChange,
  sectionId,
}) {
  const leftColumnEvents = events.filter((_, index) => index % 2 === 0);
  const rightColumnEvents = events.filter((_, index) => index % 2 === 1);

  return (
    <View style={styles.masonryRow}>
      <View style={[styles.masonryColumn, { width: columnWidth }]}>
        {leftColumnEvents.map((event) => (
          <EventCard
            columnWidth={columnWidth}
            event={event}
            key={event.id}
            onOpen={() => onOpenEvent(event.id)}
            onSavedChange={onSavedChange}
            screen="ProfileScreen"
            source={`profile_${sectionId}_list`}
          />
        ))}
      </View>

      <View style={[styles.masonryColumn, { width: columnWidth }]}>
        {rightColumnEvents.map((event) => (
          <EventCard
            columnWidth={columnWidth}
            event={event}
            key={event.id}
            onOpen={() => onOpenEvent(event.id)}
            onSavedChange={onSavedChange}
            screen="ProfileScreen"
            source={`profile_${sectionId}_list`}
          />
        ))}
      </View>
    </View>
  );
}

function ProfileEventMapView({ onPinPress, pins, profileRegion, style }) {
  return (
    <View style={[styles.mapPanel, style]}>
      <MapView
        customMapStyle={APP_MAP_STYLE}
        initialRegion={profileRegion}
        loadingBackgroundColor={colors.background}
        loadingEnabled
        loadingIndicatorColor={colors.text}
        mapType="standard"
        provider={PROVIDER_GOOGLE}
        showsBuildings={false}
        showsCompass={false}
        showsIndoors={false}
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        showsTraffic={false}
        style={styles.map}
        toolbarEnabled={false}
      >
        {pins.map((pin) => (
          <Marker
            anchor={getEventPinMarkerAnchor(pin.event)}
            coordinate={{
              latitude: pin.latitude,
              longitude: pin.longitude,
            }}
            key={pin.id}
            onPress={(markerEvent) => onPinPress(markerEvent, pin)}
          >
            {pin.photoRef ? (
              <ExperiencePin event={pin.event} photoRef={pin.photoRef} />
            ) : (
              <EventPin event={pin.event} />
            )}
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const expandedTongueTop =
    insets.top + USERNAME_NOTCH_HEIGHT + USERNAME_NOTCH_GAP + PROFILE_TONGUE_TOP_GAP;
  const expandedTop = expandedTongueTop + SHEET_TOP_EXTENSION;
  const [summaryHeight, setSummaryHeight] = useState(0);
  const collapsedVisibleHeight =
    (summaryHeight || SHEET_COLLAPSED_FALLBACK_VISIBLE_HEIGHT) +
    SHEET_COLLAPSED_SUMMARY_EXTRA_PADDING;
  const collapsedTop = Math.max(
    expandedTop + 140,
    screenHeight - collapsedVisibleHeight + BOTTOM_NAV_COLLAPSED_OVERLAP
  );
  const sheetWidth = Math.max(screenWidth - SHEET_SCREEN_MARGIN * 2, 1);
  const columnWidth = Math.max(
    (sheetWidth - SHEET_HORIZONTAL_PADDING * 2 - PROFILE_COLUMN_GAP) / 2,
    1
  );
  const [activeSection, setActiveSection] = useState("attended");
  const [activeViews, setActiveViews] = useState({
    attended: "list",
    going: "list",
    saved: "list",
  });
  const [isPhotoRailGestureActive, setIsPhotoRailGestureActive] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [isSheetScrollEnabled, setIsSheetScrollEnabled] = useState(false);
  const [profile, setProfile] = useState(null);

  const currentSheetY = useRef(collapsedTop);
  const isPhotoRailGestureActiveRef = useRef(false);
  const isSheetScrollEnabledRef = useRef(false);
  const scrollOffsetY = useRef(0);
  const scrollViewRef = useRef(null);
  const hasInitializedSheet = useRef(false);
  const isSheetExpandedRef = useRef(false);
  const sheetStartY = useRef(collapsedTop);
  const sheetY = useRef(new Animated.Value(collapsedTop)).current;
  const previousCollapsedTop = useRef(collapsedTop);

  const activeView = activeViews[activeSection] ?? "list";
  const isMapViewActive = activeView === "map";
  const usernameLabel = useMemo(() => {
    if (!profile?.username) return "";

    return profile.username.startsWith("@") ? profile.username : `@${profile.username}`;
  }, [profile?.username]);
  const sheetBodyOpacity = useMemo(() => {
    const fullyVisiblePoint = collapsedTop - 140;
    const hiddenPoint = collapsedTop - 24;

    return sheetY.interpolate({
      inputRange: [expandedTop, fullyVisiblePoint, hiddenPoint, collapsedTop],
      outputRange: [1, 1, 0, 0],
      extrapolate: "clamp",
    });
  }, [collapsedTop, expandedTop, sheetY]);
  const sheetBodyTranslateY = useMemo(
    () =>
      sheetY.interpolate({
        inputRange: [expandedTop, collapsedTop],
        outputRange: [0, 18],
        extrapolate: "clamp",
      }),
    [collapsedTop, expandedTop, sheetY]
  );
  const sheetHeight = useMemo(
    () =>
      Animated.subtract(screenHeight + SHEET_TOP_EXTENSION - SHEET_SCREEN_MARGIN, sheetY),
    [screenHeight, sheetY]
  );

  useInteractionLogger(LOG_ACTIONS.profileOpened, {
    screen: "ProfileScreen",
  });

  const refreshProfile = useCallback(async () => {
    const nextProfile = await getCurrentUserProfile();
    setProfile(nextProfile);
  }, []);

  const handleSummaryLayout = useCallback((event) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);

    if (nextHeight <= 0) return;
    setSummaryHeight((currentHeight) =>
      currentHeight === nextHeight ? currentHeight : nextHeight
    );
  }, []);

  useEffect(() => {
    isSheetScrollEnabledRef.current = isSheetScrollEnabled;
  }, [isSheetScrollEnabled]);

  const handlePhotoRailGestureActiveChange = useCallback(
    (isActive) => {
      isPhotoRailGestureActiveRef.current = isActive;

      setIsPhotoRailGestureActive((currentValue) =>
        currentValue === isActive ? currentValue : isActive
      );

      scrollViewRef.current?.setNativeProps?.({
        scrollEnabled: isActive
          ? false
          : isSheetScrollEnabledRef.current && !isMapViewActive,
      });
    },
    [isMapViewActive]
  );

  useEffect(() => {
    scrollViewRef.current?.setNativeProps?.({
      scrollEnabled:
        isSheetScrollEnabled && !isPhotoRailGestureActive && !isMapViewActive,
    });
  }, [isMapViewActive, isPhotoRailGestureActive, isSheetScrollEnabled]);

  useEffect(() => {
    if (isMapViewActive) {
      scrollOffsetY.current = 0;
    }
  }, [isMapViewActive]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getCurrentUserProfile().then((nextProfile) => {
        if (isActive) {
          setProfile(nextProfile);
        }
      });

      return () => {
        isActive = false;
      };
    }, [])
  );

  const profileRegion = useMemo(() => {
    const sectionPins = profile?.sections?.[activeSection]?.mapPins ?? [];

    return getProfileRegion(sectionPins);
  }, [activeSection, profile?.sections]);

  useEffect(() => {
    const listenerId = sheetY.addListener(({ value }) => {
      currentSheetY.current = value;
    });

    return () => sheetY.removeListener(listenerId);
  }, [sheetY]);

  useEffect(() => {
    if (!summaryHeight && !hasInitializedSheet.current) return;

    if (!hasInitializedSheet.current) {
      sheetY.setValue(collapsedTop);
      currentSheetY.current = collapsedTop;
      sheetStartY.current = collapsedTop;
      previousCollapsedTop.current = collapsedTop;
      scrollOffsetY.current = 0;
      isSheetExpandedRef.current = false;
      setIsSheetExpanded(false);
      setIsSheetScrollEnabled(false);
      scrollViewRef.current?.scrollTo?.({ animated: false, y: 0 });
      hasInitializedSheet.current = true;
      return;
    }

    const lastCollapsedTop = previousCollapsedTop.current;
    const collapsedTopChanged = lastCollapsedTop !== collapsedTop;

    previousCollapsedTop.current = collapsedTop;

    if (!collapsedTopChanged) return;

    const wasCollapsed = Math.abs(currentSheetY.current - lastCollapsedTop) < 2;

    if (wasCollapsed) {
      sheetY.setValue(collapsedTop);
      currentSheetY.current = collapsedTop;
      sheetStartY.current = collapsedTop;
    }
  }, [collapsedTop, sheetY, summaryHeight]);

  const animateSheetTo = useCallback(
    (destination) => {
      const willExpand = destination === expandedTop;

      isSheetExpandedRef.current = willExpand;

      if (!willExpand) {
        setIsSheetScrollEnabled(false);
      }

      Animated.spring(sheetY, {
        damping: 24,
        mass: 0.8,
        stiffness: 210,
        toValue: destination,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished) return;

        setIsSheetExpanded(willExpand);

        if (willExpand) {
          setIsSheetScrollEnabled(true);
        } else {
          scrollOffsetY.current = 0;
          scrollViewRef.current?.scrollTo?.({ animated: false, y: 0 });
        }
      });
    },
    [expandedTop, sheetY]
  );

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          if (isPhotoRailGestureActiveRef.current) return false;
          if (!isMostlyVerticalGesture(gestureState)) return false;

          const isDraggingDown = gestureState.dy > 0;
          const isAtTopOfScroll = scrollOffsetY.current <= 0;

          if (!isSheetExpandedRef.current) return true;

          return isDraggingDown && isAtTopOfScroll;
        },
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (isPhotoRailGestureActiveRef.current) return false;
          if (!isMostlyVerticalGesture(gestureState)) return false;

          if (!isSheetExpandedRef.current) return true;

          return gestureState.dy > 0 && scrollOffsetY.current <= 0;
        },
        onPanResponderGrant: () => {
          sheetStartY.current = currentSheetY.current;
          setIsSheetScrollEnabled(false);
        },
        onPanResponderMove: (_, gestureState) => {
          const nextY = clamp(
            sheetStartY.current + gestureState.dy,
            expandedTop,
            collapsedTop
          );

          currentSheetY.current = nextY;
          sheetY.setValue(nextY);
        },
        onPanResponderRelease: (_, gestureState) => {
          const midpoint = (expandedTop + collapsedTop) / 2;
          const shouldCollapse =
            gestureState.vy > 0.35 || currentSheetY.current > midpoint;

          animateSheetTo(shouldCollapse ? collapsedTop : expandedTop);
        },
        onPanResponderTerminate: () => {
          const midpoint = (expandedTop + collapsedTop) / 2;
          const shouldCollapse = currentSheetY.current > midpoint;

          animateSheetTo(shouldCollapse ? collapsedTop : expandedTop);
        },
      }),
    [animateSheetTo, collapsedTop, expandedTop, sheetY]
  );

  const openEvent = useCallback(
    (eventId) => {
      router.push({
        pathname: "/event/[id]",
        params: { id: eventId },
      });
    },
    [router]
  );

  const handleSectionChange = useCallback(
    (nextSection) => {
      if (nextSection === activeSection) return;

      setActiveSection(nextSection);
      logInteraction(LOG_ACTIONS.profileViewChanged, {
        result: nextSection,
        route: pathname,
        screen: "ProfileScreen",
        source: "profile_section_selector",
      }).catch(() => null);
    },
    [activeSection, pathname]
  );

  const handleViewChange = useCallback(
    (nextView) => {
      if (nextView === activeView) return;

      setActiveViews((currentViews) => ({
        ...currentViews,
        [activeSection]: nextView,
      }));
      logInteraction(LOG_ACTIONS.profileViewChanged, {
        result: nextView,
        route: pathname,
        screen: "ProfileScreen",
        source: `profile_${activeSection}_view_selector`,
      }).catch(() => null);
    },
    [activeSection, activeView, pathname]
  );

  const handlePinPress = useCallback(
    (markerEvent, pin) => {
      markerEvent?.stopPropagation?.();
      logInteraction(LOG_ACTIONS.profileExperiencePinSelected, {
        eventId: pin.eventId,
        experienceId: pin.experienceId,
        route: pathname,
        screen: "ProfileScreen",
        source: "profile_map_pin",
      }).catch(() => null);
      openEvent(pin.eventId);
    },
    [openEvent, pathname]
  );

  function renderActiveSectionContent() {
    if (!profile) return null;

    const attendedSection = profile.sections?.attended;
    const goingSection = profile.sections?.going;
    const savedSection = profile.sections?.saved;

    if (activeSection === "attended") {
      const experiences = attendedSection?.experiences ?? profile.experiences ?? [];
      const pins = attendedSection?.mapPins ?? profile.mapPins ?? [];

      if (activeView === "map") {
        if (pins.length === 0) {
          return (
            <ProfileEmptyState
              title="No attended events yet."
              body="Your attended event map will appear here."
            />
          );
        }

        return (
          <ProfileEventMapView
            onPinPress={handlePinPress}
            pins={pins}
            profileRegion={profileRegion}
          />
        );
      }

      if (experiences.length === 0) {
        return (
          <ProfileEmptyState
            title="No attended events yet."
            body="Your event memories will appear here after you attend events."
          />
        );
      }

      return (
        <View style={styles.attendedList}>
          {experiences.map((experience) => (
            <ProfileExperienceCard
              event={experience.event}
              experience={experience}
              key={experience.id}
              onOpen={() => openEvent(experience.event.id)}
              onPhotoRailGestureActiveChange={handlePhotoRailGestureActiveChange}
              screen="ProfileScreen"
              source="profile_attended_list"
            />
          ))}
        </View>
      );
    }

    if (activeSection === "going") {
      const goingEvents = goingSection?.events ?? profile.goingEvents ?? [];
      const pins = goingSection?.mapPins ?? [];

      if (activeView === "map") {
        if (pins.length === 0) {
          return (
            <ProfileEmptyState
              title="No upcoming events yet."
              body="Events you are attending will appear on this map."
            />
          );
        }

        return (
          <ProfileEventMapView
            onPinPress={handlePinPress}
            pins={pins}
            profileRegion={profileRegion}
          />
        );
      }

      if (goingEvents.length === 0) {
        return (
          <ProfileEmptyState
            title="You are not going to any upcoming events yet."
            body="Join an event to see it here."
          />
        );
      }

      return (
        <MasonryEventList
          columnWidth={columnWidth}
          events={goingEvents}
          onOpenEvent={openEvent}
          onSavedChange={refreshProfile}
          sectionId="going"
        />
      );
    }

    const savedEvents = savedSection?.events ?? profile.savedEvents ?? [];
    const pins = savedSection?.mapPins ?? [];

    if (activeView === "map") {
      if (pins.length === 0) {
        return (
          <ProfileEmptyState
            title="No saved upcoming events yet."
            body="Saved events will appear on this map."
          />
        );
      }

      return (
        <ProfileEventMapView
          onPinPress={handlePinPress}
          pins={pins}
          profileRegion={profileRegion}
        />
      );
    }

    if (savedEvents.length === 0) {
      return (
        <ProfileEmptyState
          title="No saved upcoming events yet."
          body="Saved events that are still upcoming will appear here."
        />
      );
    }

    return (
      <MasonryEventList
        columnWidth={columnWidth}
        events={savedEvents}
        onOpenEvent={openEvent}
        onSavedChange={refreshProfile}
        sectionId="saved"
      />
    );
  }

  function renderSheetBodyContent() {
    return (
      <>
        <ProfileSummary onLayout={handleSummaryLayout} profile={profile} />
        <Animated.View
          pointerEvents={isSheetScrollEnabled ? "auto" : "none"}
          style={[
            styles.sheetBody,
            {
              opacity: sheetBodyOpacity,
              transform: [{ translateY: sheetBodyTranslateY }],
            },
          ]}
        >
          <ProfileSectionTabs
            activeSection={activeSection}
            onChange={handleSectionChange}
            profile={profile}
          />
          <ProfileViewSelector activeView={activeView} onChange={handleViewChange} />
          <View
            style={
              isMapViewActive ? styles.profileContentBody : styles.profileListContentBody
            }
          >
            {renderActiveSectionContent()}
          </View>
        </Animated.View>
      </>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Image
        resizeMode="cover"
        source={getAvatarImage(profile.heroImageKey ?? profile.avatarKey)}
        style={styles.backgroundImage}
      />
      <View style={styles.backgroundOverlay} />

      <View
        pointerEvents="box-none"
        style={[
          styles.usernameNotchWrap,
          {
            top: insets.top + 8,
          },
        ]}
      >
        <View style={styles.usernameNotch}>
          <Text numberOfLines={1} style={styles.usernameNotchText}>
            {usernameLabel}
          </Text>
        </View>
      </View>

      {!isSheetExpanded && (
        <View
          {...sheetPanResponder.panHandlers}
          pointerEvents="auto"
          style={[
            styles.collapsedGestureLayer,
            {
              bottom: Math.max(insets.bottom, 12) + BOTTOM_NAV_RESERVED_HEIGHT,
            },
          ]}
        />
      )}

      <Animated.View
        {...sheetPanResponder.panHandlers}
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            left: SHEET_SCREEN_MARGIN,
            right: SHEET_SCREEN_MARGIN,
            top: -SHEET_TOP_EXTENSION,
            transform: [{ translateY: sheetY }],
          },
        ]}
      >
        <BlurView intensity={32} style={StyleSheet.absoluteFill} tint="light" />
        <View pointerEvents="none" style={styles.sheetTint} />

        {isMapViewActive ? (
          <View
            style={[
              styles.sheetStaticContent,
              {
                paddingBottom:
                  Math.max(insets.bottom, 12) +
                  PROFILE_MAP_BOTTOM_NAV_HEIGHT +
                  PROFILE_MAP_BOTTOM_GAP,
              },
            ]}
          >
            {renderSheetBodyContent()}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.sheetContent,
              {
                paddingBottom:
                  Math.max(insets.bottom, 12) +
                  BOTTOM_NAV_RESERVED_HEIGHT +
                  SHEET_EXTRA_BOTTOM_PADDING,
              },
            ]}
            onScroll={(event) => {
              scrollOffsetY.current = event.nativeEvent.contentOffset.y;
            }}
            ref={scrollViewRef}
            scrollEnabled={isSheetScrollEnabled && !isPhotoRailGestureActive}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            style={styles.sheetScroller}
          >
            {renderSheetBodyContent()}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
    overflow: "hidden",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    height: "100%",
    width: "100%",
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(247, 250, 247, 0.28)",
  },
  loadingContainer: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
  collapsedGestureLayer: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1,
  },
  usernameNotchWrap: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 50,
  },
  usernameNotch: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.62)",
    borderColor: "rgba(255, 255, 255, 0.76)",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: USERNAME_NOTCH_HEIGHT,
    paddingHorizontal: 18,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  usernameNotchText: {
    color: colors.effects.textSubtle,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
  },
  sheet: {
    borderColor: "rgba(255, 255, 255, 0.68)",
    borderRadius: SHEET_CORNER_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 12,
    overflow: "hidden",
    position: "absolute",
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    zIndex: 2,
  },
  sheetTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.62)",
  },
  sheetScroller: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: SHEET_HORIZONTAL_PADDING,
    paddingTop: 20,
  },
  sheetStaticContent: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: SHEET_HORIZONTAL_PADDING,
    paddingTop: 20,
  },
  sheetBody: {
    flex: 1,
    minHeight: 0,
  },
  summary: {
    gap: 25,
  },
  summaryTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 18,
    justifyContent: "space-between",
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  profileNameStack: {
    alignItems: "flex-start",
    alignSelf: "stretch",
    marginTop: 6,
    paddingLeft: PROFILE_NAME_LEFT_INSET,
  },
  profileNameLine: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 34,
    textAlign: "left",
  },
  statsStack: {
    alignItems: "flex-start",
    alignSelf: "flex-start",
    gap: 0,
    marginTop: 10,
    minWidth: 110,
    paddingRight: 4,
  },
  stat: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 7,
    justifyContent: "flex-start",
    minHeight: 19,
    width: "100%",
  },
  statValue: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 22,
    minWidth: 24,
    textAlign: "right",
  },
  statLabel: {
    color: colors.secondaryText,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
    lineHeight: 11,
    textAlign: "left",
    textTransform: "uppercase",
  },
  profileDescription: {
    color: colors.secondaryText,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 0,
    paddingLeft: PROFILE_NAME_LEFT_INSET + 2,
    paddingRight: 28,
  },
  sectionTabs: {
    borderBottomColor: "rgba(14, 30, 22, 0.12)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    marginTop: 26,
  },
  sectionTab: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 54,
    paddingBottom: 9,
    paddingHorizontal: 6,
    position: "relative",
  },
  sectionTabActive: {
    backgroundColor: "transparent",
  },
  sectionTabLabel: {
    color: colors.secondaryText,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
  },
  sectionTabLabelActive: {
    color: colors.text,
  },
  sectionTabCount: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    marginTop: 3,
  },
  sectionTabCountActive: {
    color: colors.text,
  },
  sectionTabIndicator: {
    backgroundColor: "transparent",
    bottom: -StyleSheet.hairlineWidth,
    height: 4,
    left: 0,
    position: "absolute",
    right: 0,
  },
  sectionTabIndicatorActive: {
    backgroundColor: colors.primary,
  },
  viewSelector: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.46)",
    borderRadius: 21,
    flexDirection: "row",
    gap: 4,
    marginTop: 18,
    padding: 4,
  },
  viewSelectorButton: {
    alignItems: "center",
    borderRadius: 17,
    flexDirection: "row",
    gap: 6,
    minHeight: 34,
    minWidth: 84,
    paddingHorizontal: 12,
  },
  viewSelectorButtonActive: {
    backgroundColor: colors.primary,
  },
  viewSelectorText: {
    color: colors.iconMuted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
  },
  viewSelectorTextActive: {
    color: colors.text,
  },
  attendedList: {
    gap: 24,
    marginTop: 18,
  },
  profileContentBody: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
  profileListContentBody: {
    width: "100%",
  },
  masonryRow: {
    flexDirection: "row",
    gap: PROFILE_COLUMN_GAP,
    marginTop: 18,
  },
  masonryColumn: {
    gap: PROFILE_ITEM_GAP,
  },
  mapPanel: {
    borderColor: colors.effects.surfaceStrongBorder,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    marginTop: 12,
    minHeight: 0,
    overflow: "hidden",
    width: "100%",
  },
  map: {
    flex: 1,
  },
  emptyState: {
    backgroundColor: colors.effects.surfaceOverlay,
    borderColor: colors.effects.surfaceStrongBorder,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    marginTop: 18,
    padding: 20,
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0,
  },
  emptyStateBody: {
    color: colors.secondaryText,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.72,
  },
});
