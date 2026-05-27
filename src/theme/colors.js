const palette = {
  primary: "#44EE66",
  secondary: "#EE44CC",
  background: "#F7FAF7",
  surface: "#FFFFFF",
  softSurface: "#EEF4EF",
  border: "#D8E3DA",
  text: "#17211A",
  secondaryText: "#4B5A50",
  mutedText: "#7A8A80",
  iconActive: "#17211A",
  iconMuted: "#5E6F64",
  error: "#D64545",
  warning: "#D8901F",
  success: "#18A33A",
};

const neutral = {
  black: "#000000",
};

export function withAlpha(hex, alpha) {
  const normalizedHex = hex.replace("#", "");
  const red = parseInt(normalizedHex.slice(0, 2), 16);
  const green = parseInt(normalizedHex.slice(2, 4), 16);
  const blue = parseInt(normalizedHex.slice(4, 6), 16);
  const clampedAlpha = Math.min(Math.max(alpha, 0), 1);

  return `rgba(${red}, ${green}, ${blue}, ${clampedAlpha})`;
}

export const colors = {
  ...palette,
  discover: palette.secondary,
  accent: {
    primary: palette.primary,
    secondary: palette.secondary,
    discover: palette.secondary,
  },
  content: {
    primary: palette.text,
    secondary: palette.secondaryText,
    muted: palette.mutedText,
  },
  surfaces: {
    app: palette.background,
    card: palette.surface,
    soft: palette.softSurface,
    border: palette.border,
  },
  icons: {
    active: palette.iconActive,
    muted: palette.iconMuted,
  },
  status: {
    error: palette.error,
    warning: palette.warning,
    success: palette.success,
  },
  effects: {
    glassTint: withAlpha(palette.surface, 0.34),
    glassBorder: withAlpha(palette.surface, 0.46),
    glassSurface: withAlpha(palette.surface, 0.82),
    imageOverlay: withAlpha(neutral.black, 0.18),
    primaryIndicator: withAlpha(palette.primary, 0.28),
    primaryPressed: withAlpha(palette.primary, 0.18),
    primaryDisabled: withAlpha(palette.primary, 0.72),
    surfaceGlow: withAlpha(palette.surface, 0.44),
    surfaceOverlay: withAlpha(palette.surface, 0.86),
    surfaceRaised: withAlpha(palette.surface, 0.88),
    surfaceBorder: withAlpha(palette.surface, 0.62),
    surfaceStrongBorder: withAlpha(palette.surface, 0.72),
    tabGlass: withAlpha(palette.surface, 0.24),
    tabLiquidGlass: withAlpha(palette.surface, 0.22),
    textSubtle: withAlpha(palette.text, 0.68),
    shadow: withAlpha(neutral.black, 1),
    shadowSubtle: withAlpha(neutral.black, 0.04),
    secondaryGlow: withAlpha(palette.secondary, 0.42),
  },
};
