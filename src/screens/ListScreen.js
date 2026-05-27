import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DiscoverModePill from "../components/DiscoverModePill";
import EventCard from "../components/EventCard";
import { useDiscoveryMode } from "../context/DiscoveryModeContext";
import useInteractionLogger from "../hooks/useInteractionLogger";
import { getEvents } from "../services/eventService";
import { LOG_ACTIONS } from "../services/interactionLogService";
import { colors } from "../theme/colors";

const TOP_NAV_OFFSET = 8;
const TOP_NAV_HEIGHT = 44;
const TOP_NAV_GAP = 10;
const BOTTOM_NAV_HEIGHT = 64;
const BOTTOM_NAV_GAP = 12;

export default function ListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState([]);
  const {
    deactivateDiscoveryMode,
    filterDiscoveryEvents,
    isDiscoveryActive,
  } = useDiscoveryMode();
  useInteractionLogger(LOG_ACTIONS.listViewOpened, {
    screen: "ListScreen",
  });
  const topPadding =
    insets.top +
    TOP_NAV_OFFSET +
    TOP_NAV_HEIGHT +
    TOP_NAV_GAP +
    (isDiscoveryActive ? 42 : 0);

  const contentStyle = [
    styles.content,
    {
      paddingTop: topPadding,
      paddingBottom:
        Math.max(insets.bottom, 12) + BOTTOM_NAV_HEIGHT + BOTTOM_NAV_GAP,
    },
  ];

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
      };
    }, [filterDiscoveryEvents]),
  );

  const handleDiscoverDismiss = useCallback(() => {
    deactivateDiscoveryMode({
      route: "/map/list",
      screen: "ListScreen",
      source: "discover_pill",
    });
  }, [deactivateDiscoveryMode]);

  return (
    <View
      style={[
        styles.container,
        isDiscoveryActive && styles.discoverContainer,
      ]}
    >
      {isDiscoveryActive && (
        <>
          <View pointerEvents="none" style={styles.discoverDecoration}>
            <View style={styles.discoverBubble}>
              <View style={styles.discoverBubbleGlow} />
              <View style={styles.discoverBubbleCore} />
            </View>
            {Array.from({ length: 42 }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.discoverParticle,
                  {
                    height: 5 + (index % 7),
                    left: `${(index * 23) % 100}%`,
                    opacity: 0.28 + ((index * 17) % 45) / 100,
                    top: 10 + ((index * 31) % 150),
                    width: 5 + (index % 7),
                  },
                ]}
              />
            ))}
          </View>
          <DiscoverModePill
            onPress={handleDiscoverDismiss}
            style={[styles.discoverPill, { top: insets.top + 62 }]}
          />
        </>
      )}

      <FlatList
        contentContainerStyle={contentStyle}
        data={events}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            screen="ListScreen"
            source="list"
            onSavedChange={(updatedEvent) =>
              setEvents((currentEvents) =>
                currentEvents.map((event) =>
                  event.id === updatedEvent.id ? updatedEvent : event,
                ),
              )
            }
            onOpen={() =>
              router.push({
                pathname: "/event/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  discoverContainer: {
    backgroundColor: colors.primary,
  },
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  separator: {
    height: 14,
  },
  discoverDecoration: {
    height: 220,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 0,
  },
  discoverBubble: {
    alignItems: "center",
    backgroundColor: "#F58BEA",
    borderRadius: 86,
    height: 172,
    justifyContent: "center",
    left: "50%",
    marginLeft: -86,
    position: "absolute",
    top: -92,
    width: 172,
  },
  discoverBubbleGlow: {
    backgroundColor: "rgba(255, 255, 255, 0.44)",
    borderRadius: 60,
    height: 120,
    left: 18,
    position: "absolute",
    top: 14,
    width: 120,
  },
  discoverBubbleCore: {
    backgroundColor: colors.discover,
    borderRadius: 56,
    height: 112,
    opacity: 0.78,
    width: 112,
  },
  discoverParticle: {
    backgroundColor: colors.discover,
    borderRadius: 8,
    position: "absolute",
  },
  discoverPill: {
    left: "50%",
    marginLeft: -45,
    position: "absolute",
    zIndex: 5,
  },
});
