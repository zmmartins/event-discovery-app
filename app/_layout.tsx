import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Explore" }} />
      <Stack.Screen name="list" options={{ title: "Events" }} />
      <Stack.Screen name="map" options={{ title: "Map" }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen name="event/[id]" options={{ title: "Event Details" }} />
    </Stack>
  );
}
