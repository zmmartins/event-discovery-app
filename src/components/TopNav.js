import { Ionicons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { usePathname, useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { colors } from "../theme/colors";
import {
  LIQUID_GLASS_ANDROID_BACKGROUND_COLOR,
  LIQUID_GLASS_COLOR_SCHEME,
  LIQUID_GLASS_DEFAULT_BACKGROUND_COLOR,
  LIQUID_GLASS_EFFECT_STYLE,
  LIQUID_GLASS_FALLBACK_BACKGROUND_COLOR,
  LIQUID_GLASS_IOS_BACKGROUND_COLOR,
  LIQUID_GLASS_TINT_COLOR,
} from "../theme/liquidGlass";
import {
  LOG_ACTIONS,
  logInteraction,
} from "../services/interactionLogService";

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
    route: "/map/list",
    icon: "menu",
    accessibilityLabel: "Open event list",
  },
  {
    route: "/map/shake-discover",
    icon: "flash",
    accessibilityLabel: "Open shake to discover",
  },
  {
    route: "/map/notifications",
    icon: "notifications",
    accessibilityLabel: "Open notifications",
    standalone: true,
  },
];

function getLiquidGlassAvailable() {
  if (Platform.OS !== "ios") return false;

  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

const liquidGlassAvailable = getLiquidGlassAvailable();

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/$/, "");
}

function GlassSurface({ children, style }) {
  const surfaceStyle = [
    styles.glassSurface,
    Platform.select({
      android: styles.androidGlassFallback,
      ios: liquidGlassAvailable
        ? styles.iosLiquidGlassSurface
        : styles.iosGlassFallback,
      default: styles.defaultGlassFallback,
    }),
    style,
  ];

  if (Platform.OS === "ios" && liquidGlassAvailable) {
    return (
      <GlassView
        colorScheme={LIQUID_GLASS_COLOR_SCHEME}
        glassEffectStyle={LIQUID_GLASS_EFFECT_STYLE}
        isInteractive={false}
        style={surfaceStyle}
        tintColor={LIQUID_GLASS_TINT_COLOR}
      >
        {children}
      </GlassView>
    );
  }

  return <View style={surfaceStyle}>{children}</View>;
}

function TopNavButton({ item }) {
  const router = useRouter();
  const pathname = normalizePathname(usePathname());
  const isActive = item.route && pathname === item.route;

  function handlePress() {
    if (!item.route) {
      logInteraction(LOG_ACTIONS.filterOpened, {
        route: pathname,
        screen: "TopNav",
        source: "top_nav",
      }).catch(() => null);
      return;
    }

    if (isActive) return;
    logInteraction(LOG_ACTIONS.topNavSelected, {
      fromRoute: pathname,
      route: pathname,
      screen: "TopNav",
      source: "top_nav",
      targetRoute: item.route,
    }).catch(() => null);
    router.replace(item.route);
  }

  const button = (
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
        color={isActive ? colors.iconActive : colors.iconMuted}
      />
    </Pressable>
  );

  if (item.standalone) {
    return (
      <GlassSurface style={styles.standaloneSurface}>{button}</GlassSurface>
    );
  }

  return button;
}

export default function TopNav() {
  const [filters, map, list, discover, notifications] = topItems;

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View style={styles.sideZone}>
        <TopNavButton item={filters} />
      </View>

      <GlassSurface style={styles.centerGroup}>
        <TopNavButton item={map} />
        <TopNavButton item={list} />
        <TopNavButton item={discover} />
      </GlassSurface>

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
    borderRadius: 22,
    flexDirection: "row",
    minHeight: 44,
    paddingHorizontal: 6,
  },
  glassSurface: {
    borderColor: colors.effects.glassBorder,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: colors.effects.shadow,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  iosLiquidGlassSurface: {
    backgroundColor: LIQUID_GLASS_IOS_BACKGROUND_COLOR,
  },
  iosGlassFallback: {
    backgroundColor: LIQUID_GLASS_FALLBACK_BACKGROUND_COLOR,
  },
  androidGlassFallback: {
    backgroundColor: LIQUID_GLASS_ANDROID_BACKGROUND_COLOR,
    elevation: 6,
  },
  defaultGlassFallback: {
    backgroundColor: LIQUID_GLASS_DEFAULT_BACKGROUND_COLOR,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  standaloneSurface: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  standaloneButton: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  activeButton: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.72,
  },
});
