import { Stack } from "expo-router";
import { useEffect } from "react";

import {
  LOG_ACTIONS,
  logInteraction,
} from "../src/services/interactionLogService";

export default function RootLayout() {
  useEffect(() => {
    logInteraction(LOG_ACTIONS.appOpened, {
      route: "/",
      screen: "RootLayout",
    }).catch(() => null);
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
