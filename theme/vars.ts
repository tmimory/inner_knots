import { vars } from "nativewind";

import { hexToRgbChannels, kebab } from "./color";
import { scalarTokenGroups, themeColors, type ThemeName } from "./tokens";

/**
 * The same CSS variables `theme/global.css` defines for the web, built at runtime
 * for native. Both this and `scripts/build-theme-css.mjs` read `scalarTokenGroups`
 * from the tokens, so the two cannot drift in value or in naming.
 */
function buildVars(name: ThemeName): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, hex] of Object.entries(themeColors[name])) {
    result[`--color-${kebab(key)}`] = hexToRgbChannels(hex);
  }

  for (const group of scalarTokenGroups) {
    for (const [key, value] of Object.entries(group.record)) {
      result[`--${group.prefix}-${kebab(key)}`] = `${value}${group.unit}`;
    }
  }

  return result;
}

/** NativeWind style objects, one per theme, applied to the root view on native. */
export const themeVars = {
  scroll: vars(buildVars("scroll")),
  nightScroll: vars(buildVars("nightScroll")),
} as const;
