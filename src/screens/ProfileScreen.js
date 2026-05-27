import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ExperiencePin from "../components/ExperiencePin";
import ProfileExperienceCard from "../components/ProfileExperienceCard";
import useInteractionLogger from "../hooks/useInteractionLogger";
import {
  LOG_ACTIONS,
  logInteraction,
} from "../services/interactionLogService";
import { getCurrentUserProfile } from "../services/profileService";
import { colors } from "../theme/colors";
import { getAvatarImage, getEventImage } from "../utils/imageAssets";

const DEFAULT_REGION = {
  latitude: 38.7223,
  latitudeDelta: 0.06,
  longitude: -9.1393,
  longitudeDelta: 0.06,
};

const PROFILE_MAP_STYLE = [
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
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#d9dede" }],
  },
];

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

function StatRow({ label, value }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

function ProfileHeader({ profile }) {
  return (
    <View style={styles.header}>
      <Text numberOfLines={1} style={styles.username}>
        {profile.username}
      </Text>

      <View style={styles.identityRow}>
        <Image
          accessibilityLabel={`${profile.username} profile picture`}
          source={getAvatarImage(profile.avatarKey)}
          style={styles.profileImage}
        />

        <View style={styles.statsStack}>
          <StatRow label="friends" value={profile.stats.friends} />
          <StatRow label="attended events" value={profile.stats.attendedEvents} />
          <StatRow
            label="unique experiences"
            value={profile.stats.uniqueExperiences}
          />
        </View>
      </View>
    </View>
  );
}

function ViewSelector({ activeView, onChange }) {
  const options = [
    { icon: "list", label: "List", value: "list" },
    { icon: "map", label: "Map", value: "map" },
  ];

  return (
    <View style={styles.selector}>
      {options.map((option) => {
        const isActive = activeView === option.value;

        return (
          <Pressable
            accessibilityLabel={`Show profile ${option.label.toLowerCase()} view`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.selectorButton,
              isActive && styles.selectorButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={option.icon}
              size={22}
              color={isActive ? colors.surface : colors.iconMuted}
            />
            <Text
              style={[
                styles.selectorText,
                isActive && styles.selectorTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const [activeView, setActiveView] = useState("list");
  const [profile, setProfile] = useState(null);
  useInteractionLogger(LOG_ACTIONS.profileOpened, {
    screen: "ProfileScreen",
  });

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
    }, []),
  );

  const profileRegion = useMemo(
    () => getProfileRegion(profile?.mapPins),
    [profile?.mapPins],
  );

  const updateSavedEvent = useCallback((updatedEvent) => {
    if (!updatedEvent) return;

    setProfile((currentProfile) => {
      if (!currentProfile) return currentProfile;

      return {
        ...currentProfile,
        experiences: currentProfile.experiences.map((experience) =>
          experience.event.id === updatedEvent.id
            ? { ...experience, event: updatedEvent }
            : experience,
        ),
      };
    });
  }, []);

  const openExperience = useCallback(
    (eventId) => {
      router.push({
        pathname: "/event/[id]",
        params: { id: eventId },
      });
    },
    [router],
  );

  const handleViewChange = useCallback(
    (nextView) => {
      if (nextView === activeView) return;

      setActiveView(nextView);
      logInteraction(LOG_ACTIONS.profileViewChanged, {
        result: nextView,
        route: pathname,
        screen: "ProfileScreen",
        source: "profile_view_selector",
      }).catch(() => null);
    },
    [activeView, pathname],
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
      openExperience(pin.eventId);
    },
    [openExperience, pathname],
  );

  if (!profile) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + 24 }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 18 }]}>
      <ProfileHeader profile={profile} />
      <ViewSelector activeView={activeView} onChange={handleViewChange} />

      {activeView === "list" ? (
        <ScrollView
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: Math.max(insets.bottom, 12) + 92,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {profile.experiences.map((experience) => (
            <View key={experience.id} style={styles.experienceBlock}>
              <ProfileExperienceCard
                event={experience.event}
                experience={experience}
                onOpen={() => openExperience(experience.event.id)}
                onSavedChange={updateSavedEvent}
                screen="ProfileScreen"
                source="profile_list"
              />

              <View style={styles.photoGrid}>
                {experience.photoRefs.map((photoRef) => (
                  <Image
                    accessibilityLabel={`${experience.event.title} memory`}
                    key={photoRef.id}
                    source={getEventImage(photoRef.imageKey)}
                    style={styles.photoTile}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.mapPanel,
            { marginBottom: Math.max(insets.bottom, 12) + 86 },
          ]}
        >
          <MapView
            customMapStyle={PROFILE_MAP_STYLE}
            initialRegion={profileRegion}
            loadingBackgroundColor="#f4f4f4"
            loadingEnabled
            loadingIndicatorColor="#111111"
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
            {profile.mapPins.map((pin) => (
              <Marker
                anchor={{ x: 0.5, y: 1 }}
                coordinate={{
                  latitude: pin.latitude,
                  longitude: pin.longitude,
                }}
                key={pin.id}
                onPress={(markerEvent) => handlePinPress(markerEvent, pin)}
              >
                <ExperiencePin photoRef={pin.photoRef} />
              </Marker>
            ))}
          </MapView>
        </View>
      )}
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
  },
  header: {
    paddingHorizontal: 24,
  },
  username: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
  },
  identityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 22,
    marginTop: 18,
  },
  profileImage: {
    borderColor: colors.surface,
    borderRadius: 48,
    borderWidth: 4,
    height: 96,
    width: 96,
  },
  statsStack: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  statRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 8,
  },
  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    minWidth: 26,
  },
  statLabel: {
    color: colors.mutedText,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  selector: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    flexDirection: "row",
    marginHorizontal: 24,
    marginTop: 22,
    minHeight: 48,
    overflow: "hidden",
    padding: 4,
  },
  selectorButton: {
    alignItems: "center",
    borderRadius: 18,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 40,
  },
  selectorButtonActive: {
    backgroundColor: colors.primary,
  },
  selectorText: {
    color: colors.iconMuted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
  },
  selectorTextActive: {
    color: colors.surface,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  experienceBlock: {
    marginBottom: 22,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  photoTile: {
    aspectRatio: 1,
    borderRadius: 10,
    width: "31.2%",
  },
  mapPanel: {
    borderRadius: 22,
    flex: 1,
    marginHorizontal: 20,
    marginTop: 18,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
