import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

import { getEventById, joinEvent } from "../services/eventService";
import { logInteraction } from "../services/interactionLogService";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const [event, setEvent] = useState(null);

  useEffect(() => {
    if (!id) return;

    async function loadEvent() {
      const selectedEvent = await getEventById(id);
      setEvent(selectedEvent);

      await logInteraction("event_detail_opened", {
        eventId: id,
        screen: "EventDetailScreen",
      });
    }

    loadEvent();
  }, [id]);

  async function handleJoin() {
    if (!event) return;

    const updatedEvent = await joinEvent(event.id);
    setEvent(updatedEvent);

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await logInteraction("participation_confirmed", {
      eventId: event.id,
      screen: "EventDetailScreen",
    });
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <Text>Evento não encontrado ou a carregar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{event.title}</Text>

      <Text style={styles.meta}>
        {event.category} · {event.locationName}
      </Text>

      <Text style={styles.meta}>
        {event.date} · {event.time}
      </Text>

      <Text style={styles.price}>{event.price}</Text>

      <Text style={styles.description}>{event.description}</Text>

      <Button
        title={event.isJoined ? "A participar" : "Participar"}
        onPress={handleJoin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
  },
  meta: {
    fontSize: 15,
    color: "#555",
  },
  price: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "700",
  },
  description: {
    marginTop: 16,
    fontSize: 16,
    lineHeight: 22,
  },
});
