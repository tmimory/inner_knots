/**
 * The single source of truth for every design value in inner_knots.
 *
 * Nothing else in the codebase may contain a literal color, font family, radius,
 * shadow, spacing step, duration, easing curve or z-index. Consumers get these
 * values through:
 *
 *  - Tailwind / NativeWind classes  -> `theme/tailwind-tokens.cjs` (generated)
 *  - Web CSS variables              -> `theme/global.css` (generated)
 *  - Native CSS variables           -> `vars()` in `theme/index.ts`
 *  - Raw values in JS (SVG fills,
 *    React Flow styles, charts,
 *    easing curves)                 -> `useTheme()` in `theme/index.ts`
 *
 * Regenerate the derived files with `npm run theme:css` (also run by `predev`).
 *
 * Theme "scroll": iron-gall ink on aged parchment, rubric-red accents, verdigris
 * and gilt highlights — a medieval manuscript that learned to hold a debate.
 * Theme "nightScroll": the same manuscript read by candlelight.
 *
 * Every foreground/background pairing below clears WCAG AA (4.5:1) for body text.
 */

export type ThemeName = "scroll" | "nightScroll";

export type ThemeColors = {
  /** Page background — the parchment itself. */
  background: string;
  /** Default text color — iron-gall ink. */
  foreground: string;
  /** Raised surfaces (cards, the Scroll panel). */
  card: string;
  cardForeground: string;
  /** Floating surfaces (menus, dialogs, tooltips). */
  popover: string;
  popoverForeground: string;
  /** Recessed surfaces and disabled fills. */
  muted: string;
  /** Secondary ink: descriptions, metadata, captions. */
  mutedForeground: string;
  /** Tertiary ink: placeholders, marginalia, the quietest line on a screen. */
  subtleForeground: string;
  /** Rubric red: headings, primary actions. */
  primary: string;
  primaryForeground: string;
  /** Verdigris / bronze patina. */
  secondary: string;
  secondaryForeground: string;
  /** Gilt: highlights, active states. */
  accent: string;
  accentForeground: string;
  /** Oxblood: destructive actions. */
  destructive: string;
  destructiveForeground: string;
  /** Hairlines and rules. */
  border: string;
  /** Form field fills. */
  input: string;
  /** Focus ring. */
  ring: string;
  /** Chart / comparison series one — ink blue. */
  track1: string;
  /** Chart / comparison series two — ochre. */
  track2: string;
};

const scroll: ThemeColors = {
  background: "#EFE3C4",
  foreground: "#2A1F14",
  card: "#F5EBD2",
  cardForeground: "#2A1F14",
  popover: "#F5EBD2",
  popoverForeground: "#2A1F14",
  muted: "#E4D5AF",
  mutedForeground: "#5C4A33",
  subtleForeground: "#7A6748",
  primary: "#8B2E1F",
  primaryForeground: "#F5EBD2",
  secondary: "#3E5949",
  secondaryForeground: "#F5EBD2",
  accent: "#A8862B",
  accentForeground: "#2A1F14",
  destructive: "#6E1B14",
  destructiveForeground: "#F5EBD2",
  border: "#C9B68C",
  input: "#FAF3E0",
  ring: "#A8862B",
  track1: "#2F4A6B",
  track2: "#A2611F",
};

const nightScroll: ThemeColors = {
  background: "#14110D",
  foreground: "#E8DCC0",
  card: "#1E1A14",
  cardForeground: "#E8DCC0",
  popover: "#1E1A14",
  popoverForeground: "#E8DCC0",
  muted: "#2A241B",
  mutedForeground: "#B3A484",
  subtleForeground: "#948871",
  primary: "#D2705A",
  primaryForeground: "#14110D",
  secondary: "#6E907C",
  secondaryForeground: "#14110D",
  accent: "#D4AC4A",
  accentForeground: "#14110D",
  destructive: "#E2725B",
  destructiveForeground: "#14110D",
  border: "#3C3428",
  input: "#272219",
  ring: "#D4AC4A",
  track1: "#7FA3C9",
  track2: "#D9A059",
};

export const themeColors: Record<ThemeName, ThemeColors> = { scroll, nightScroll };

/** Which theme each color scheme resolves to. */
export const schemeThemes = {
  light: "scroll",
  dark: "nightScroll",
} as const satisfies Record<"light" | "dark", ThemeName>;

/**
 * Font families. The values are the family names registered by `expo-font`
 * (they match the export names of the `@expo-google-fonts/*` packages).
 */
export const fonts = {
  /** Cinzel — Roman inscriptional capitals, for headings and the wordmark. */
  display: "Cinzel_600SemiBold",
  displayBold: "Cinzel_700Bold",
  /** Cormorant Garamond — a readable old-style serif for body copy. */
  body: "CormorantGaramond_400Regular",
  bodyMedium: "CormorantGaramond_500Medium",
  bodySemiBold: "CormorantGaramond_600SemiBold",
  bodyBold: "CormorantGaramond_700Bold",
  bodyItalic: "CormorantGaramond_400Regular_Italic",
  /**
   * EB Garamond Italic — the subtitle voice. A Garamond sibling of the body serif
   * whose glyph set covers polytonic Greek, so `δεσμοὶ τῆς ψυχῆς` sets in the same
   * family as everything around it instead of dropping to a sans fallback.
   */
  greek: "EBGaramond_400Regular_Italic",
  greekBold: "EBGaramond_600SemiBold_Italic",
  /** System monospace stack for code, ids and raw payloads. */
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;

/** Web-only fallback stacks appended after the loaded family name. */
export const fontFallbacks = {
  display: "Cinzel, Georgia, 'Times New Roman', serif",
  body: "'Cormorant Garamond', Garamond, Georgia, serif",
  bodyMedium: "'Cormorant Garamond', Garamond, Georgia, serif",
  greek: "'EB Garamond', Garamond, Georgia, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;

/** Spacing scale, in px. Components use the named steps (`p-md`, `gap-lg`). */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
} as const;

/** Corner radii, in px. `full` is the pill/circle value. */
export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

/** Ink-soft shadows. CSS shadow strings; NativeWind maps them for native. */
export const shadows = {
  inkSoft: "0 1px 2px rgb(var(--color-foreground) / 0.08)",
  inkRaised: "0 2px 8px rgb(var(--color-foreground) / 0.12)",
  inkLifted: "0 8px 24px rgb(var(--color-foreground) / 0.18)",
  none: "none",
} as const;

/**
 * Opacity scale. Named so state treatments cannot drift: `opacity-disabled`,
 * `opacity-hover`, and as color modifiers `bg-foreground/scrim`, `bg-muted/subtle`.
 */
export const opacities = {
  /** Non-interactive controls. */
  disabled: 0.5,
  /** Hover and press feedback on filled surfaces. */
  hover: 0.9,
  /** Dimming behind a dialog or drawer. */
  scrim: 0.4,
  /** A barely-there tint, e.g. a menu row under the cursor. */
  subtle: 0.6,
} as const;

/** Motion durations, in ms. */
export const durations = {
  fast: 120,
  normal: 200,
  slow: 360,
} as const;

/**
 * Motion curves, as cubic-bezier control points.
 *
 * Stored as plain numbers rather than a `cubic-bezier(...)` string or a Reanimated
 * `Easing` value so this file stays importable by the Node CSS generator and by
 * native alike: the web build spells them into `--easing-standard`, and
 * `Easing.bezier(...theme.easings.standard)` spells them into a native animation.
 */
export const easings = {
  /** Ease-in-out cubic: the app's one curve for anything that moves. */
  standard: [0.65, 0, 0.35, 1],
} as const;

/** Stacking layers. */
export const zIndex = {
  base: 0,
  menu: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
  tooltip: 60,
} as const;

/**
 * Interactive control heights, in px. Exposed as spacing keys, so a button reads
 * `h-control-md` rather than a magic number.
 */
export const controlSizes = {
  "control-sm": 32,
  "control-md": 40,
  "control-lg": 48,
  "control-icon": 40,
} as const;

/**
 * Avatar medallion diameters, in px. Named so a character avatar reads
 * `h-avatar-md` rather than a magic number, and so the SVG art can be handed the
 * same number through `useTheme().avatarSizes`.
 */
export const avatarSizes = {
  "avatar-sm": 32,
  "avatar-md": 40,
  "avatar-lg": 64,
  "avatar-xl": 96,
} as const;

/** Layout measures, in px: the left menu column and the readable content width. */
export const layout = {
  menu: 264,
  content: 1120,
  /** Height of an embedded graph canvas — the adventure builder and the outcome view. */
  canvas: 640,
  /** The inspector column beside a canvas: wide enough for a labelled textarea. */
  inspector: 360,
  /**
   * Smallest a floating menu may be — a select's list, a dropdown. Named apart
   * from `menu` (the nav rail) so tuning the sidebar cannot resize every popover.
   */
  popover: 264,
  /** Viewport width at and above which the menu is a fixed column, not a drawer. */
  wideBreakpoint: 900,
} as const;

/** Border widths, in px. */
export const borderWidths = {
  hairline: 1,
  thick: 2,
} as const;

/** Font sizes, in px, named rather than numeric so type scale stays one decision. */
export const fontSizes = {
  xs: 13,
  sm: 15,
  base: 17,
  lg: 20,
  xl: 24,
  "2xl": 30,
  "3xl": 38,
  "4xl": 48,
} as const;

/** Line heights, in px, paired with `fontSizes` by key. */
export const lineHeights = {
  xs: 18,
  sm: 22,
  base: 26,
  lg: 28,
  xl: 32,
  "2xl": 38,
  "3xl": 46,
  "4xl": 56,
} as const;

/**
 * The Tailwind sizing scale: spacing steps, control heights and hairline widths all
 * answer `h-*` / `w-*` / `p-*`, so they share one namespace.
 */
export const sizes = { ...spacing, ...controlSizes, ...avatarSizes, ...borderWidths } as const;

export type TokenGroup = {
  /** CSS variable prefix: `--<prefix>-<key>`. */
  prefix: string;
  record: Record<string, number>;
  unit: "px" | "ms" | "";
};

/**
 * Every scalar token category, in one list. Both the CSS/Tailwind generator
 * (`scripts/build-theme-css.mjs`) and the native `vars()` builder (`theme/vars.ts`)
 * iterate this, so adding a category is one entry here rather than a loop in each.
 * Colors, fonts and shadows are not scalars and are handled separately.
 */
export const scalarTokenGroups: TokenGroup[] = [
  { prefix: "font-size", record: fontSizes, unit: "px" },
  { prefix: "line-height", record: lineHeights, unit: "px" },
  { prefix: "space", record: sizes, unit: "px" },
  { prefix: "layout", record: layout, unit: "px" },
  { prefix: "radius", record: radii, unit: "px" },
  { prefix: "border-width", record: borderWidths, unit: "px" },
  { prefix: "opacity", record: opacities, unit: "" },
  { prefix: "duration", record: durations, unit: "ms" },
  { prefix: "z", record: zIndex, unit: "" },
];

export type AvatarColor = {
  /** Stable id stored on a Character. */
  id: string;
  /** Human label shown in the picker. */
  label: string;
  hex: string;
};

/** 25 named pigments for character avatars — scribe's pigment box. */
export const avatarPalette: AvatarColor[] = [
  { id: "rubric", label: "Rubric", hex: "#8B2E1F" },
  { id: "ochre", label: "Ochre", hex: "#A2611F" },
  { id: "verdigris", label: "Verdigris", hex: "#3E5949" },
  { id: "lapis", label: "Lapis", hex: "#2F4A6B" },
  { id: "saffron", label: "Saffron", hex: "#C9922A" },
  { id: "madder", label: "Madder", hex: "#A34437" },
  { id: "indigo", label: "Indigo", hex: "#33396B" },
  { id: "umber", label: "Umber", hex: "#5C4432" },
  { id: "olive", label: "Olive", hex: "#6B6B2E" },
  { id: "tyrian", label: "Tyrian", hex: "#6B2A55" },
  { id: "terracotta", label: "Terracotta", hex: "#B56145" },
  { id: "slate", label: "Slate", hex: "#4A5560" },
  { id: "sage", label: "Sage", hex: "#7C8F6F" },
  { id: "wine", label: "Wine", hex: "#5E1F2B" },
  { id: "mustard", label: "Mustard", hex: "#B08B1E" },
  { id: "copper", label: "Copper", hex: "#9C5A2D" },
  { id: "teal", label: "Teal", hex: "#2C6265" },
  { id: "plum", label: "Plum", hex: "#4F3357" },
  { id: "sand", label: "Sand", hex: "#B9A173" },
  { id: "charcoal", label: "Charcoal", hex: "#33302B" },
  { id: "moss", label: "Moss", hex: "#47623B" },
  { id: "coral", label: "Coral", hex: "#C0614F" },
  { id: "ivory", label: "Ivory", hex: "#D8C8A2" },
  { id: "cobalt", label: "Cobalt", hex: "#2B5A8C" },
  { id: "bronze", label: "Bronze", hex: "#8A6A32" },
];

/** Everything a component might need at runtime for one theme. */
export type Theme = {
  name: ThemeName;
  colors: ThemeColors;
  fonts: typeof fonts;
  spacing: typeof spacing;
  controlSizes: typeof controlSizes;
  avatarSizes: typeof avatarSizes;
  layout: typeof layout;
  radii: typeof radii;
  shadows: typeof shadows;
  opacities: typeof opacities;
  durations: typeof durations;
  easings: typeof easings;
  zIndex: typeof zIndex;
  borderWidths: typeof borderWidths;
  fontSizes: typeof fontSizes;
  lineHeights: typeof lineHeights;
  avatarPalette: AvatarColor[];
};

function buildTheme(name: ThemeName): Theme {
  return {
    name,
    colors: themeColors[name],
    fonts,
    spacing,
    controlSizes,
    avatarSizes,
    layout,
    radii,
    shadows,
    opacities,
    durations,
    easings,
    zIndex,
    borderWidths,
    fontSizes,
    lineHeights,
    avatarPalette,
  };
}

export const themes: Record<ThemeName, Theme> = {
  scroll: buildTheme("scroll"),
  nightScroll: buildTheme("nightScroll"),
};

export default themes;
