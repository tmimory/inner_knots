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
  /**
   * Pin the rail while the main column scrolls past it (web only).
   *
   * It goes on the same box as the rule, never on a wrapper around it: a sticky
   * element travels inside its own parent, so a rail that was ruled on a wrapper
   * and stuck on a box inside it had nowhere to go and simply froze at the top of
   * the page. With `railRule="content"` the column around it is what gives it the
   * run, which is why `stretch` is forced on while it is set.
   */
  railSticky?: boolean;
  className?: string;
};

/** The hairline and the gutter it hangs in, wherever it is being drawn. */
const RULE = "wide:border-l-hairline wide:border-border wide:pl-xl";

/**
 * What pins the rail: `top-xl` is the content pane's own top padding, so a pinned
 * rail sits exactly where it started rather than sliding under the page title.
 */
const STICKY = "web:sticky web:top-xl";

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
 *
 * `railRule="content"` with `railSticky` is the combination two screens had
 * written out by hand: the rail follows you down a long form, and its hairline
 * stops where its own content does rather than ruling off the page beneath it.
 */
export function SplitPane({
  main,
  rail,
  railWidth = "inspector",
  stretch = true,
  railRule = "column",
  railSticky = false,
  className,
}: SplitPaneProps) {
  const onColumn = railRule === "column";
  // A rail ruled on its content sticks inside the column around it, so that column
  // has to be as tall as the page for the rail to have anywhere to travel.
  const stretched = stretch || (railSticky && !onColumn);

  return (
    <View
      className={cn(
        "gap-xl wide:flex-row",
        stretched ? "wide:items-stretch" : "wide:items-start",
        className,
      )}
    >
      {/* `min-w-0` so a wide child — a table, a canvas — shrinks with the pane
          instead of pushing the rail off the right edge. */}
      <View className="min-w-0 flex-1 gap-2xl">{main}</View>
      {/* Width, border and gutter all sit on one box or the other, never split
          between them, so the rail's content lands on the same axis either way.
          Whichever box carries the rule is the box that sticks: when the rule is
          on the column, the column must also stop being stretched, or a sticky
          element as tall as the page has no run to make. */}
      <View
        className={cn(
          RAIL_WIDTHS[railWidth],
          onColumn &&
            cn("gap-2xl", RULE, railSticky && `${STICKY} wide:self-start`),
        )}
      >
        {onColumn ? (
          rail
        ) : (
          <View className={cn("gap-2xl", RULE, railSticky && STICKY)}>
            {rail}
          </View>
        )}
      </View>
    </View>
  );
}
