import type { ReactNode } from "react";
import { View } from "react-native";

import { cn } from "@/lib/utils";

/**
 * How wide the rail is on a wide viewport.
 *
 * `inspector` is the narrow column beside a canvas or a form — a run's status, a
 * node's fields, a live roster. `reading` is the wider one a rail gets when its
 * contents are prose or a table rather than a few labelled values.
 */
export type RailWidth = "inspector" | "reading";

/**
 * Where the divider between the two columns is drawn.
 *
 * `column` puts it on the rail column itself, so it runs the full depth of the
 * taller side — the right reading when the two columns are peers. `content`
 * moves it onto the rail's own content block: the column still stretches, so
 * anything sticky in the rail has the height to move in, but the rule stops
 * where the rail's content does instead of ruling off two thirds of a page the
 * rail has nothing to say about.
 */
export type RailRule = "column" | "content";

export type SplitPaneProps = {
  /** The column that owns the page: the form, the canvas, the table. */
  main: ReactNode;
  /** The column beside it: status, inspector, summary. */
  rail: ReactNode;
  /** Defaults to `inspector`. */
  railWidth?: RailWidth;
  /**
   * Let the two columns share one height. Turn it off when the rail is short and
   * the column itself should not be stretched at all.
   */
  stretch?: boolean;
  /** Where the divider is drawn. Defaults to `column`. */
  railRule?: RailRule;
  className?: string;
};

/** The hairline and the gutter it hangs in, wherever it is being drawn. */
const RULE = "wide:border-l-hairline wide:border-border wide:pl-xl";

const RAIL_WIDTHS: Record<RailWidth, string> = {
  inspector: "wide:w-inspector",
  reading: "wide:w-reading",
};

/**
 * A page split into a main column and a rail, divided by a hairline.
 *
 * Three screens are this shape — the dilemma's setup beside its run, the builder's
 * canvas beside its inspector, a run's detail beside its summary — and each had
 * written its own version, which is why the divider ran to a different depth and
 * the rail sat at a different width on all three.
 *
 * It is one column on a narrow viewport, stacked in the reading order the wide
 * layout puts them in, with no rule: a vertical hairline between two things that
 * are no longer side by side is a line across the page.
 */
export function SplitPane({
  main,
  rail,
  railWidth = "inspector",
  stretch = true,
  railRule = "column",
  className,
}: SplitPaneProps) {
  const onColumn = railRule === "column";

  return (
    <View
      className={cn(
        "gap-xl wide:flex-row",
        stretch ? "wide:items-stretch" : "wide:items-start",
        className,
      )}
    >
      {/* `min-w-0` so a wide child — a table, a canvas — shrinks with the pane
          instead of pushing the rail off the right edge. */}
      <View className="min-w-0 flex-1 gap-2xl">{main}</View>
      {/* Width, border and gutter all sit on one box or the other, never split
          between them, so the rail's content lands on the same axis either way. */}
      <View className={cn(RAIL_WIDTHS[railWidth], onColumn && `gap-2xl ${RULE}`)}>
        {onColumn ? rail : <View className={cn("gap-2xl", RULE)}>{rail}</View>}
      </View>
    </View>
  );
}
