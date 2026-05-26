import { Stack } from "expo-router";

import AppShell from "../../../src/components/AppShell";

export default function MapLayout() {
  return (
    <AppShell>
      <Stack screenOptions={{ headerShown: false }} />
    </AppShell>
  );
}
