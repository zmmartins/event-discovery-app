import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "../theme/colors";

const topItems = [
  {
    route: null,
    icon: "filter",
    accessibilityLabel: "Filter options",
    standalone: true,
  },
  {
    route: "/map",
    icon: "location",
    accessibilityLabel: "Open map",
  },
  {
    route: "/list",
    icon: "menu",
    accessibilityLabel: "Open event list",
  },
  {
    route: "/shake-discover",
    icon: "flash",
    accessibilityLabel: "Open shake to discover",
  },
  {
    route: "/notifications",
    icon: "notifications",
    accessibilityLabel: "Open notifications",
    standalone: true,
  },
];

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/$/, "");
}

function TopNavButton({ item }) {
  const router = useRouter();
  const pathname = normalizePathname(usePathname());
  const isActive = item.route && pathname === item.route;

  function handlePress() {
    if (!item.route) return;
    if (isActive) return;
    router.replace(item.route);
  }

  return (
    <Pressable
      accessibilityLabel={item.accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.iconButton,
        item.standalone && styles.standaloneButton,
        isActive && styles.activeButton,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={item.icon}
        size={22}
        color={isActive ? colors.surface : colors.iconMuted}
      />
    </Pressable>
  );
}

export default function TopNav() {
  const [filters, map, list, discover, notifications] = topItems;

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View style={styles.sideZone}>
        <TopNavButton item={filters} />
      </View>

      <View style={styles.centerGroup}>
        <TopNavButton item={map} />
        <TopNavButton item={list} />
        <TopNavButton item={discover} />
      </View>

      <View style={styles.sideZone}>
        <TopNavButton item={notifications} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    width: "100%",
  },
  sideZone: {
    alignItems: "center",
    flex: 1,
  },
  centerGroup: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 22,
    elevation: 6,
    flexDirection: "row",
    minHeight: 44,
    paddingHorizontal: 6,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  standaloneButton: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    elevation: 6,
    height: 44,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    width: 44,
  },
  activeButton: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.72,
  },
});
