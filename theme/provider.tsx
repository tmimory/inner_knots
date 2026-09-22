import { useColorScheme as useNativeWindScheme } from "nativewind";
import { createContext, use, useMemo, type ReactNode } from "react";
import { Platform, View, useColorScheme as useSystemScheme } from "react-native";

import { schemeThemes, themes, type Theme, type ThemeName } from "./tokens";
import { themeVars } from "./vars";

const ThemeContext = createContext<Theme>(themes.scroll);

/**
 * Which of the two palettes is live, asked of whatever actually decides it.
 *
 * On the web the CSS is the authority. `theme/global.css` defines the dark
 * variables twice: under `.dark`, and under
 * `@media (prefers-color-scheme: dark) { :root:not(.light) }`. Nothing in the app
 * puts a `dark` class on `<html>`, so it is the media query that flips every
 * class-styled surface — while NativeWind's `useColorScheme()`, which reports the
 * class, went on saying "light". Everything drawn through `useTheme()` (the
 * decision cards, React Flow's handles and edges, the trolley rails, the charts,
 * the avatars) therefore kept the parchment palette under cream text: light card,
 * light letters, nothing readable. So on the web the provider reads the same
 * signal the stylesheet does — React Native Web backs `useColorScheme` with
 * `matchMedia('(prefers-color-scheme: dark)')` and updates live — and the two
 * halves of the theme agree again.
 *
 * Server render: React Native Web guards that `matchMedia` with `canUseDOM` and
 * answers "light" when there is no window, so this is safe to call during SSR.
 * The client's first paint may flip to dark; nothing but colours changes.
 *
 * On native there is no stylesheet: NativeWind's own scheme is what its `dark:`
 * variants follow, so that is the one to match.
 */
function useActiveScheme(): "light" | "dark" {
  const systemScheme = useSystemScheme();
  const { colorScheme: classScheme } = useNativeWindScheme();
  const active = Platform.OS === "web" ? systemScheme : classScheme;
  return active === "dark" ? "dark" : "light";
}

/**
 * Applies the active theme and exposes its tokens.
 *
 * Web: `theme/global.css` already defines the variables for `:root`, for `.dark`
 * and for a dark system preference, so the provider only supplies context — the
 * same scheme the stylesheet resolved, as {@link useActiveScheme} explains.
 * Native: the variables are injected with NativeWind `vars()` on a root view.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const name: ThemeName = schemeThemes[useActiveScheme()];
  const theme = useMemo(() => themes[name], [name]);

  if (Platform.OS === "web") {
    return <ThemeContext value={theme}>{children}</ThemeContext>;
  }

  return (
    <ThemeContext value={theme}>
      <View style={themeVars[name]} className="flex-1">
        {children}
      </View>
    </ThemeContext>
  );
}

/** The active theme's raw tokens, for values that cannot be expressed as a class. */
export function useTheme(): Theme {
  return use(ThemeContext);
}

/** The active theme's name (`"scroll"` | `"nightScroll"`). */
export function useThemeName(): ThemeName {
  return use(ThemeContext).name;
}
