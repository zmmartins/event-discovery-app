import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

import { getEventById, joinEvent } from "../services/eventService";
import { logInteraction } from "../services/interactionLogService";

export default function EventDetailScreen({ route }) {
  const { eventId } = route.params;
  const [event, setEvent] = useState(null);

  useEffect(() => {
    getEventById(eventId).then(setEvent);
    logInteraction("event_detail_opened", { eventId });
  }, [eventId]);

  async function handleJoin() {
    const updatedEvent = await joinEvent(eventId);
    setEvent(updatedEvent);

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await logInteraction("participation_confirmed", { eventId });
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <Text>A carregar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{event.title}</Text>
      <Text>{event.category}</Text>
      <Text>{event.locationName}</Text>
      <Text>
        {event.date} · {event.time}
      </Text>
      <Text>{event.price}</Text>
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
  description: {
    marginTop: 16,
    fontSize: 16,
  },
});
