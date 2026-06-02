import { Ionicons } from "@expo/vector-icons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import {
  Icon,
  Label,
  NativeTabs,
  type NativeTabsBlurEffect,
  type NativeTabsTriggerTabBarProps,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import ScreenStatusBar from "../../src/components/ScreenStatusBar";
import { colors } from "../../src/theme/colors";
import {
  LIQUID_GLASS_ANDROID_BACKGROUND_COLOR,
  LIQUID_GLASS_FALLBACK_BACKGROUND_COLOR,
  LIQUID_GLASS_IOS_BACKGROUND_COLOR,
  LIQUID_GLASS_TAB_BLUR_EFFECT,
  getLiquidGlassIconColor,
} from "../../src/theme/liquidGlass";

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
  ? LIQUID_GLASS_IOS_BACKGROUND_COLOR
  : LIQUID_GLASS_FALLBACK_BACKGROUND_COLOR;

const tabBackgroundColor = Platform.select({
  ios: lightGlassBackgroundColor,
  android: LIQUID_GLASS_ANDROID_BACKGROUND_COLOR,
  default: LIQUID_GLASS_ANDROID_BACKGROUND_COLOR,
});

const tabBlurEffect: NativeTabsBlurEffect | undefined =
  Platform.OS === "ios"
    ? (LIQUID_GLASS_TAB_BLUR_EFFECT as NativeTabsBlurEffect)
    : undefined;

const tabIconColor = getLiquidGlassIconColor({ active: false });
const activeTabIconColor = getLiquidGlassIconColor({ active: true });

const lightTabBarProps: NativeTabsTriggerTabBarProps = {
  backgroundColor: tabBackgroundColor,
  blurEffect: tabBlurEffect,
  disableTransparentOnScrollEdge: true,
  iconColor: tabIconColor,
  shadowColor: colors.effects.shadowSubtle,
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
          default: tabIconColor,
          selected: activeTabIconColor,
        }}
        indicatorColor={colors.effects.primaryIndicator}
        labelVisibilityMode="unlabeled"
        minimizeBehavior="automatic"
        rippleColor={colors.effects.primaryPressed}
        shadowColor={colors.effects.shadowSubtle}
        tintColor={activeTabIconColor}
      >
        <NativeTabs.Trigger name="map">
          <NativeTabs.Trigger.TabBar {...lightTabBarProps} />
          <Icon
            sf={{ default: "map", selected: "map.fill" }}
            androidSrc={{
              default: <VectorIcon family={Ionicons} name="map" />,
              selected: <VectorIcon family={Ionicons} name="map" />,
            }}
            selectedColor={activeTabIconColor}
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
            selectedColor={activeTabIconColor}
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
            selectedColor={activeTabIconColor}
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
            selectedColor={activeTabIconColor}
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
            selectedColor={activeTabIconColor}
          />
          <Label hidden>Profile</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}
