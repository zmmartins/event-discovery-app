import { Slot } from "expo-router";

import AppShell from "../../src/components/AppShell";

export default function TabsLayout() {
  return (
    <AppShell>
      <Slot />
    </AppShell>
  );
}
