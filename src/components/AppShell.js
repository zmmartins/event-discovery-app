import { StyleSheet, View } from "react-native";
import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDiscoveryMode } from "../context/DiscoveryModeContext";
import { colors } from "../theme/colors";
import TopNav from "./TopNav";

const discoveryRoutes = ["/map", "/map/list", "/map/shake-discover"];
const edgeToEdgeRoutes = ["/map", "/map/list"];

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/$/, "");
}

export default function AppShell({ children }) {
  const insets = useSafeAreaInsets();
  const { isDiscoveryActive } = useDiscoveryMode();
  const pathname = normalizePathname(usePathname());
  const showTopNav = discoveryRoutes.includes(pathname);
  const isEdgeToEdge = edgeToEdgeRoutes.includes(pathname);
  const isDiscoverSurface =
    pathname === "/map/shake-discover" ||
    (isDiscoveryActive && edgeToEdgeRoutes.includes(pathname));

  return (
    <View style={[styles.root, isDiscoverSurface && styles.discoverRoot]}>
      {showTopNav && (
        <View style={[styles.topNav, { top: insets.top + 8 }]}>
          <TopNav />
        </View>
      )}

      <View
        style={[
          styles.content,
          {
            paddingTop: isEdgeToEdge
              ? 0
              : showTopNav
                ? insets.top + 84
                : insets.top + 24,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  discoverRoot: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
  },
  topNav: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 20,
  },
});
