import { Stack } from "expo-router";

import AppShell from "../../../src/components/AppShell";
import { DiscoveryModeProvider } from "../../../src/context/DiscoveryModeContext";

export default function MapLayout() {
  return (
    <DiscoveryModeProvider>
      <AppShell>
        <Stack screenOptions={{ headerShown: false }} />
      </AppShell>
    </DiscoveryModeProvider>
  );
}
