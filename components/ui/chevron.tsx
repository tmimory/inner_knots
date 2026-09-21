import { Path, Svg } from "react-native-svg";

import { useTheme } from "@/theme";

export type ChevronProps = {
  /** Which way it points. `down` is the open state of a disclosure. */
  direction?: "down" | "right";
  /** Edge length in px. Defaults to the x-height of a body line. */
  size?: number;
  /** A `ThemeColors` key. Defaults to the secondary ink. */
  tone?: "foreground" | "mutedForeground" | "subtleForeground" | "primary";
};

/**
 * The one chevron in the app: a stroked glyph rather than the `▾` character.
 *
 * The typographic triangle sets a size and a weight of its own — in the serif
 * stack it came out tiny and pale beside its label — while this one is drawn to
 * the x-height of the line it sits on, in the label's own ink.
 */
export function Chevron({ direction = "down", size, tone = "mutedForeground" }: ChevronProps) {
  const theme = useTheme();
  const edge = size ?? theme.fontSizes.xs;
  const color = theme.colors[tone];
  const d = direction === "down" ? "M3 6.5 L8 11 L13 6.5" : "M6.5 3 L11 8 L6.5 13";

  return (
    <Svg width={edge} height={edge} viewBox="0 0 16 16" aria-hidden>
      <Path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={theme.borderWidths.thick}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
