import { DynamicColorIOS, Platform, PlatformColor } from "react-native";

import { colors } from "./colors";

export const LIQUID_GLASS_COLOR_SCHEME = "light";
export const LIQUID_GLASS_EFFECT_STYLE = "regular";
export const LIQUID_GLASS_TINT_COLOR = colors.effects.glassTint;
export const LIQUID_GLASS_IOS_BACKGROUND_COLOR = colors.effects.tabLiquidGlass;
export const LIQUID_GLASS_FALLBACK_BACKGROUND_COLOR = colors.effects.tabGlass;
export const LIQUID_GLASS_DEFAULT_BACKGROUND_COLOR = colors.effects.glassSurface;
export const LIQUID_GLASS_ANDROID_BACKGROUND_COLOR = colors.surface;
export const LIQUID_GLASS_TAB_BLUR_EFFECT = "systemUltraThinMaterialLight";

export const LIQUID_GLASS_DARK_ICON_COLOR = "#FFFFFF";
export const LIQUID_GLASS_DARK_INACTIVE_ICON_COLOR = "rgba(255, 255, 255, 0.86)";
export const LIQUID_GLASS_LIGHT_ACTIVE_ICON_COLOR = colors.iconActive;
export const LIQUID_GLASS_LIGHT_INACTIVE_ICON_COLOR = colors.iconMuted;

export function getAdaptiveLiquidGlassIconColor({ active = false } = {}) {
  if (Platform.OS !== "ios") {
    return active
      ? LIQUID_GLASS_LIGHT_ACTIVE_ICON_COLOR
      : LIQUID_GLASS_LIGHT_INACTIVE_ICON_COLOR;
  }

  return DynamicColorIOS({
    light: active
      ? LIQUID_GLASS_LIGHT_ACTIVE_ICON_COLOR
      : LIQUID_GLASS_LIGHT_INACTIVE_ICON_COLOR,
    dark: active
      ? LIQUID_GLASS_DARK_ICON_COLOR
      : LIQUID_GLASS_DARK_INACTIVE_ICON_COLOR,
  });
}

export function getSemanticLiquidGlassIconColor({ active = false } = {}) {
  if (Platform.OS !== "ios") {
    return active
      ? LIQUID_GLASS_LIGHT_ACTIVE_ICON_COLOR
      : LIQUID_GLASS_LIGHT_INACTIVE_ICON_COLOR;
  }

  return active
    ? PlatformColor("labelColor")
    : PlatformColor("secondaryLabelColor");
}

export function getLiquidGlassIconColor({ active = false } = {}) {
  return getAdaptiveLiquidGlassIconColor({ active });
}
