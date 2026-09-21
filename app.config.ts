import type { ExpoConfig } from "expo/config";

import { themeColors } from "./theme/tokens.ts";

/**
 * Expo config. Written in TypeScript so the native splash and icon chrome can read
 * the same tokens as the app instead of repeating hex values.
 *
 * `web.output: "server"` is what makes `app/api/**+api.ts` run as a real backend.
 */
const config: ExpoConfig = {
  name: "inner knots",
  slug: "inner-knots",
  version: "0.1.0",
  scheme: "innerknots",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  android: {
    adaptiveIcon: {
      backgroundColor: themeColors.scroll.background,
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: "metro",
    output: "server",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: themeColors.scroll.background,
        dark: { backgroundColor: themeColors.nightScroll.background },
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
