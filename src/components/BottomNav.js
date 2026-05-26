import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "../theme/colors";

const bottomItems = [
  {
    route: "/map",
    icon: "map",
    accessibilityLabel: "Open event discovery",
    activeRoutes: ["/map", "/list", "/shake-discover"],
  },
  {
    route: "/messages",
    icon: "navigate",
    accessibilityLabel: "Open messages",
  },
  {
    route: "/search",
    icon: "search",
    accessibilityLabel: "Open search",
  },
  {
    route: "/community",
    icon: "people",
    accessibilityLabel: "Open community",
  },
  {
    route: "/profile",
    icon: "person",
    accessibilityLabel: "Open profile",
  },
];

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/$/, "");
}

export default function BottomNav() {
  const router = useRouter();
  const pathname = normalizePathname(usePathname());

  function handlePress(route) {
    if (pathname === route) return;
    router.replace(route);
  }

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View style={styles.container}>
        {bottomItems.map((item) => {
          const activeRoutes = item.activeRoutes ?? [item.route];
          const isActive = activeRoutes.includes(pathname);

          return (
            <Pressable
              accessibilityLabel={item.accessibilityLabel}
              accessibilityRole="button"
              hitSlop={8}
              key={item.route}
              onPress={() => handlePress(item.route)}
              style={({ pressed }) => [
                styles.item,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={31}
                color={isActive ? colors.primary : colors.iconMuted}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    paddingHorizontal: 18,
  },
  container: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    elevation: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    maxWidth: 320,
    minHeight: 64,
    paddingHorizontal: 14,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    width: "100%",
  },
  item: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 44,
  },
  pressed: {
    opacity: 0.7,
  },
});
