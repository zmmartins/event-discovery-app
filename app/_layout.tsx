import { Stack, usePathname } from "expo-router";
import { useEffect, useRef } from "react";

import {
  LOG_ACTIONS,
  logInteraction,
} from "../src/services/interactionLogService";

function getRouteTab(pathname: string | null) {
  if (!pathname || pathname === "/") return "explore";
  if (pathname.startsWith("/map")) return "explore";
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/community")) return "community";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/event")) return "event_detail";

  return "unknown";
}

function isBottomTab(tab: string | null) {
  return (
    tab === "explore" ||
    tab === "messages" ||
    tab === "search" ||
    tab === "community" ||
    tab === "profile"
  );
}

export default function RootLayout() {
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);
  const previousTabRef = useRef<string | null>(null);

  useEffect(() => {
    logInteraction(LOG_ACTIONS.appOpened, {
      route: "/",
      screen: "RootLayout",
    }).catch(() => null);
  }, []);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    const previousTab = previousTabRef.current;
    const currentTab = getRouteTab(pathname);

    previousPathnameRef.current = pathname;
    previousTabRef.current = currentTab;

    if (!previousPathname || previousPathname === pathname) return;

    logInteraction(LOG_ACTIONS.routeChanged, {
      fromRoute: previousPathname,
      fromTab: previousTab,
      route: previousPathname,
      screen: "RootLayout",
      source: "route_observer",
      tab: previousTab,
      targetRoute: pathname,
      targetTab: currentTab,
    }).catch(() => null);

    if (
      previousTab &&
      previousTab !== currentTab &&
      isBottomTab(previousTab) &&
      isBottomTab(currentTab)
    ) {
      logInteraction(LOG_ACTIONS.bottomNavRouteChanged, {
        fromRoute: previousPathname,
        fromTab: previousTab,
        route: previousPathname,
        screen: "RootLayout",
        source: "native_tabs",
        tab: previousTab,
        targetRoute: pathname,
        targetTab: currentTab,
      }).catch(() => null);
    }
  }, [pathname]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
