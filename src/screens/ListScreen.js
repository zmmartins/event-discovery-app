import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
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
const LIST_HORIZONTAL_PADDING = 20;
const LIST_COLUMN_GAP = 12;
const LIST_ITEM_GAP = 22;

export default function ListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
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
  const columnWidth = Math.max(
    (screenWidth - LIST_HORIZONTAL_PADDING * 2 - LIST_COLUMN_GAP) / 2,
    1,
  );
  const leftColumnEvents = events.filter((_, index) => index % 2 === 0);
  const rightColumnEvents = events.filter((_, index) => index % 2 === 1);

  const contentStyle = [
    styles.content,
    {
      paddingBottom:
        Math.max(insets.bottom, 12) + BOTTOM_NAV_HEIGHT + BOTTOM_NAV_GAP,
      paddingHorizontal: LIST_HORIZONTAL_PADDING,
      paddingTop: topPadding,
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

  const handleSavedChange = useCallback((updatedEvent) => {
    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event,
      ),
    );
  }, []);

  const renderEventCard = useCallback(
    (item) => (
      <EventCard
        columnWidth={columnWidth}
        event={item}
        screen="ListScreen"
        source="list"
        onSavedChange={handleSavedChange}
        onOpen={() =>
          router.push({
            pathname: "/event/[id]",
            params: { id: item.id },
          })
        }
      />
    ),
    [columnWidth, handleSavedChange, router],
  );

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

      <ScrollView
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      >
        <View style={styles.masonryRow}>
          <View style={[styles.column, { width: columnWidth }]}>
            {leftColumnEvents.map((event) => (
              <View key={event.id}>{renderEventCard(event)}</View>
            ))}
          </View>

          <View style={[styles.column, { width: columnWidth }]}>
            {rightColumnEvents.map((event) => (
              <View key={event.id}>{renderEventCard(event)}</View>
            ))}
          </View>
        </View>
      </ScrollView>
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
    flexGrow: 1,
  },
  masonryRow: {
    flexDirection: "row",
    gap: LIST_COLUMN_GAP,
  },
  column: {
    gap: LIST_ITEM_GAP,
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
    backgroundColor: colors.secondary,
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
    backgroundColor: colors.effects.surfaceGlow,
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
