import { Ionicons } from "@expo/vector-icons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import ScreenStatusBar from "../../src/components/ScreenStatusBar";
import { colors } from "../../src/theme/colors";

function getLiquidGlassAvailable() {
  if (Platform.OS !== "ios") return false;

  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

const liquidGlassAvailable = getLiquidGlassAvailable();

const lightGlassBackgroundColor = liquidGlassAvailable
  ? "rgba(255, 255, 255, 0.22)"
  : "rgba(255, 255, 255, 0.24)";

const tabBackgroundColor = Platform.select({
  ios: lightGlassBackgroundColor,
  android: colors.surface,
  default: colors.surface,
});

const tabBlurEffect =
  Platform.OS === "ios" ? "systemUltraThinMaterialLight" : undefined;

const lightTabBarProps = {
  backgroundColor: tabBackgroundColor,
  blurEffect: tabBlurEffect,
  disableTransparentOnScrollEdge: true,
  iconColor: colors.iconMuted,
  shadowColor: "rgba(0, 0, 0, 0.04)",
};

export default function TabsLayout() {
  return (
    <>
      <ScreenStatusBar variant="lightBackground" />

      <NativeTabs
        backgroundColor={tabBackgroundColor}
        blurEffect={tabBlurEffect}
        disableTransparentOnScrollEdge
        disableIndicator={Platform.OS !== "android"}
        iconColor={{
          default: colors.iconMuted,
          selected: colors.primary,
        }}
        indicatorColor="rgba(57, 245, 122, 0.28)"
        labelVisibilityMode="unlabeled"
        minimizeBehavior="automatic"
        rippleColor="rgba(57, 245, 122, 0.18)"
        shadowColor="rgba(0, 0, 0, 0.04)"
        tintColor={colors.primary}
      >
        <NativeTabs.Trigger name="map">
          <NativeTabs.Trigger.TabBar {...lightTabBarProps} />
          <Icon
            sf={{ default: "map", selected: "map.fill" }}
            androidSrc={{
              default: <VectorIcon family={Ionicons} name="map" />,
              selected: <VectorIcon family={Ionicons} name="map" />,
            }}
            selectedColor={colors.primary}
          />
          <Label hidden>Explore</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="messages">
          <NativeTabs.Trigger.TabBar {...lightTabBarProps} />
          <Icon
            sf={{ default: "paperplane", selected: "paperplane.fill" }}
            androidSrc={{
              default: <VectorIcon family={Ionicons} name="navigate" />,
              selected: <VectorIcon family={Ionicons} name="navigate" />,
            }}
            selectedColor={colors.primary}
          />
          <Label hidden>Messages</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="search">
          <NativeTabs.Trigger.TabBar {...lightTabBarProps} />
          <Icon
            sf={{
              default: "magnifyingglass",
              selected: "magnifyingglass",
            }}
            androidSrc={{
              default: <VectorIcon family={Ionicons} name="search" />,
              selected: <VectorIcon family={Ionicons} name="search" />,
            }}
            selectedColor={colors.primary}
          />
          <Label hidden>Search</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="community">
          <NativeTabs.Trigger.TabBar {...lightTabBarProps} />
          <Icon
            sf={{ default: "person.3", selected: "person.3.fill" }}
            androidSrc={{
              default: <VectorIcon family={Ionicons} name="people" />,
              selected: <VectorIcon family={Ionicons} name="people" />,
            }}
            selectedColor={colors.primary}
          />
          <Label hidden>Community</Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.TabBar {...lightTabBarProps} />
          <Icon
            sf={{ default: "person", selected: "person.fill" }}
            androidSrc={{
              default: <VectorIcon family={Ionicons} name="person" />,
              selected: <VectorIcon family={Ionicons} name="person" />,
            }}
            selectedColor={colors.primary}
          />
          <Label hidden>Profile</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}
