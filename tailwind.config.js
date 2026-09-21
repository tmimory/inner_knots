/**
 * Tailwind / NativeWind config.
 *
 * Every design value comes from `theme/tailwind-tokens.cjs`, which is generated from
 * `theme/tokens.ts` by `npm run theme:css`. Never write a literal color, size or
 * duration in this file — add it to the tokens instead.
 */
const themeTokens = require("./theme/tailwind-tokens.cjs");

/** @type {import("tailwindcss").Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "./theme/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: themeTokens,
  },
  plugins: [],
};
