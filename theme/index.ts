/**
 * Theme runtime.
 *
 * - `ThemeProvider` resolves which of the two palettes is live and puts its tokens
 *   in context. On web the variables themselves come from `theme/global.css`,
 *   which answers a `dark` class *or* a dark system preference — so the provider
 *   reads `prefers-color-scheme` to arrive at the same answer the stylesheet did,
 *   rather than setting anything. On native it injects the variables with
 *   NativeWind `vars()` on a root view. Both drive the same variable names.
 * - `useTheme()` returns the raw token object for the few places that must pass a
 *   color as a value rather than a class: SVG fills, React Flow styles, charts.
 *
 * Token values themselves live only in `theme/tokens.ts`.
 */
export { ThemeProvider, useTheme, useThemeName } from "./provider";
export { themeVars } from "./vars";
export {
  avatarPalette,
  avatarSizes,
  borderWidths,
  controlSizes,
  durations,
  easings,
  fontSizes,
  fonts,
  iconSizes,
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
