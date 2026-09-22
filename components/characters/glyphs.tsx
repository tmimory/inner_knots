import { Circle, Path, Rect, Svg } from "react-native-svg";

import { useTheme } from "@/theme";

/** A `ThemeColors` key a glyph may be drawn in. */
type GlyphTone = "foreground" | "mutedForeground" | "subtleForeground" | "destructive";

export type GlyphProps = {
  /** Edge length in px. Defaults to the size of the line the glyph sits on. */
  size?: number;
  /** A `ThemeColors` key. Defaults to the tertiary ink. */
  tone?: GlyphTone;
};

/**
 * The three small marks the Characters screens draw themselves.
 *
 * Drawn rather than typed: `🔍`, `🔒` and `⚠` arrive as emoji on one platform and
 * as a pale glyph missing from the serif stack on another, and none of the three
 * can be given the line's own ink. Each is stroked on a 16-unit grid with the
 * chevron's weight, so a magnifier beside a placeholder and a chevron beside a
 * select read as the same hand.
 */
function useGlyph(size: number | undefined, tone: GlyphTone) {
  const theme = useTheme();
  return {
    edge: size ?? theme.fontSizes.base,
    color: theme.colors[tone],
    stroke: theme.borderWidths.thick,
  };
}

/** The leading mark in a search field. */
export function SearchGlyph({ size, tone = "subtleForeground" }: GlyphProps) {
  const { edge, color, stroke } = useGlyph(size, tone);
  return (
    <Svg width={edge} height={edge} viewBox="0 0 16 16" aria-hidden>
      <Circle cx={7} cy={7} r={4.2} fill="none" stroke={color} strokeWidth={stroke} />
      <Path d="M10.4 10.4 L14 14" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  );
}

/** Marks a value that cannot be edited; carries the reason in a tooltip. */
export function LockGlyph({ size, tone = "subtleForeground" }: GlyphProps) {
  const { edge, color, stroke } = useGlyph(size, tone);
  return (
    <Svg width={edge} height={edge} viewBox="0 0 16 16" aria-hidden>
      <Rect
        x={3.5}
        y={7}
        width={9}
        height={6.5}
        rx={1.5}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
      />
      <Path
        d="M5.75 7 V5.25 A2.25 2.25 0 0 1 10.25 5.25 V7"
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Sits before a field's validation message so the red is not the only signal. */
export function WarningGlyph({ size, tone = "destructive" }: GlyphProps) {
  const { edge, color, stroke } = useGlyph(size, tone);
  return (
    <Svg width={edge} height={edge} viewBox="0 0 16 16" aria-hidden>
      <Path
        d="M8 2.2 L14.4 13.4 H1.6 Z"
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <Path d="M8 6.2 V9.4" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <Circle cx={8} cy={11.4} r={0.9} fill={color} />
    </Svg>
  );
}
