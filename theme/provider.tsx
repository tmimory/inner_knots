import { useColorScheme } from "nativewind";
import { createContext, use, useMemo, type ReactNode } from "react";
import { Platform, View } from "react-native";

import { schemeThemes, themes, type Theme, type ThemeName } from "./tokens";
import { themeVars } from "./vars";

const ThemeContext = createContext<Theme>(themes.scroll);

/**
 * Applies the active theme and exposes its tokens.
 *
 * Web: `theme/global.css` already defines the variables for `:root` and `.dark`,
 * and NativeWind toggles the `dark` class on <html>, so the provider only supplies
 * context. Native: the variables are injected with NativeWind `vars()` on a root view.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme } = useColorScheme();
  const name: ThemeName = schemeThemes[colorScheme === "dark" ? "dark" : "light"];
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
