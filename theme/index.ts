/**
 * Theme runtime.
 *
 * - `ThemeProvider` applies the active theme: a `dark` class on web, NativeWind
 *   `vars()` on native (both drive the same CSS variable names).
 * - `useTheme()` returns the raw token object for the few places that must pass a
 *   color as a value rather than a class: SVG fills, React Flow styles, charts.
 *
 * Token values themselves live only in `theme/tokens.ts`.
 */
export { ThemeProvider, useTheme, useThemeName } from "./provider";
export { themeVars } from "./vars";
export {
  avatarPalette,
  borderWidths,
  controlSizes,
  durations,
  fontSizes,
  fonts,
  layout,
  lineHeights,
  opacities,
  radii,
  schemeThemes,
  shadows,
  spacing,
  themeColors,
  themes,
  zIndex,
} from "./tokens";
export type { AvatarColor, Theme, ThemeColors, ThemeName } from "./tokens";
