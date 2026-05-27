import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EventCard from "../components/EventCard";
import useInteractionLogger from "../hooks/useInteractionLogger";
import { getEvents } from "../services/eventService";
import { LOG_ACTIONS } from "../services/interactionLogService";

const TOP_NAV_OFFSET = 8;
const TOP_NAV_HEIGHT = 44;
const TOP_NAV_GAP = 10;
const BOTTOM_NAV_HEIGHT = 64;
const BOTTOM_NAV_GAP = 12;

export default function ListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState([]);
  useInteractionLogger(LOG_ACTIONS.listViewOpened, {
    screen: "ListScreen",
  });

  const contentStyle = [
    styles.content,
    {
      paddingTop: insets.top + TOP_NAV_OFFSET + TOP_NAV_HEIGHT + TOP_NAV_GAP,
      paddingBottom:
        Math.max(insets.bottom, 12) + BOTTOM_NAV_HEIGHT + BOTTOM_NAV_GAP,
    },
  ];

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
      };
    }, []),
  );

  return (
    <View style={styles.container}>
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
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  separator: {
    height: 14,
  },
});
