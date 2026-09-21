import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/theme";

/** Which token the ornament is drawn with. */
export type GreekKeyTone = "border" | "accent" | "primary" | "mutedForeground";

export type GreekKeyProps = {
  /** How many meander repeats to draw. */
  repeats?: number;
  tone?: GreekKeyTone;
  className?: string;
};

/** One meander cell, drawn in a 10x10 unit box and tiled horizontally. */
const CELL = 10;

function cellPath(offsetX: number): string {
  const x = offsetX;
  return [
    `M${x + 1} 9`,
    `V3`,
    `H${x + 7}`,
    `V7`,
    `H${x + 4}`,
    `V5`,
    `H${x + 6}`,
  ].join(" ");
}

function toneColor(theme: Theme, tone: GreekKeyTone): string {
  return theme.colors[tone];
}

/**
 * A Greek-key (meander) rule. Purely decorative: it sits under the wordmark and at
 * the head of a Scroll surface to say "old manuscript" without saying anything.
 */
export function GreekKey({ repeats = 8, tone = "border", className }: GreekKeyProps) {
  const theme = useTheme();
  const paths = useMemo(
    () => Array.from({ length: repeats }, (_, index) => cellPath(index * CELL)),
    [repeats],
  );
  const width = repeats * CELL;

  return (
    <View className={cn("h-md w-full overflow-hidden", className)} style={{ pointerEvents: "none" }}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${CELL}`}
        preserveAspectRatio="none"
        accessibilityRole="image"
        aria-label="Greek key ornament"
      >
        {paths.map((d, index) => (
          <Path
            key={index}
            d={d}
            stroke={toneColor(theme, tone)}
            strokeWidth={theme.borderWidths.hairline}
            fill="none"
            strokeLinecap="square"
          />
        ))}
      </Svg>
    </View>
  );
}
