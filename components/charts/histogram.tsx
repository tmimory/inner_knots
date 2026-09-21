import type { ReactNode } from "react";
import { useMemo } from "react";
import { View, useWindowDimensions } from "react-native";

import { Text } from "@/components/ui";
import {
  buildHistogram,
  type HistogramGroupInput,
  type HistogramSeries,
} from "@/lib/charts/histogram";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { layout, useTheme, type Theme } from "@/theme";

/** The token a series is drawn with. Two tracks, then a spread for the rest. */
export type SeriesColorKey = "track1" | "track2" | "secondary" | "accent" | "primary" | "mutedForeground";

/**
 * The colors a chart reaches for, in order, when a series does not name one.
 * The first two are the comparison pair the theme exists to provide; the rest
 * keep a five- or six-way chart legible without inventing a palette.
 */
export const SERIES_COLOR_KEYS: readonly SeriesColorKey[] = [
  "track1",
  "track2",
  "secondary",
  "accent",
  "primary",
  "mutedForeground",
];

/** A series, optionally pinned to a particular theme color. */
export type HistogramSeriesSpec = HistogramSeries & { color?: SeriesColorKey };

/** A group, plus the trimmings only the screen knows about. */
export type HistogramGroupSpec = HistogramGroupInput & {
  /** Rendered before the group's label — an avatar, a glyph. */
  accessory?: ReactNode;
  /** A short aside under the label, e.g. "2 errors". */
  note?: string;
};

export type HistogramProps = {
  series: readonly HistogramSeriesSpec[];
  groups: readonly HistogramGroupSpec[];
  /** What to say when nothing has been counted yet. */
  emptyMessage?: string;
  /** Show the "mean weight 0.71" line under a bar that reported one. */
  showWeights?: boolean;
  /**
   * Set the groups beside each other rather than stacked, on a viewport wide
   * enough for it. Two groups compared head to head — the dilemma's two players —
   * read better as a pair of columns; a roster of five does not.
   */
  sideBySide?: boolean;
  className?: string;
};

function colorFor(theme: Theme, spec: HistogramSeriesSpec, index: number): string {
  const key = spec.color ?? SERIES_COLOR_KEYS[index % SERIES_COLOR_KEYS.length] ?? "track1";
  return theme.colors[key];
}

/**
 * Grouped horizontal bars: one cluster per group, one bar per series.
 *
 * Bars are plain Views with a percentage width rather than SVG, so they reflow
 * with the panel they sit in and inherit the theme through ordinary tokens. Every
 * bar keeps its row even at zero, which is what makes "this character never chose
 * track 2" visible instead of absent.
 */
export function Histogram({
  series,
  groups,
  emptyMessage = "Nothing counted yet.",
  showWeights = true,
  sideBySide = false,
  className,
}: HistogramProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { rows, empty } = useMemo(() => buildHistogram(series, groups), [series, groups]);
  const colors = series.map((spec, index) => colorFor(theme, spec, index));
  // Every bar still scales against the longest bar in the whole chart, so the
  // columns compare against each other rather than each filling its own.
  const columns = sideBySide && width >= layout.wideBreakpoint && rows.length > 1;

  return (
    <View className={cn("gap-lg", className)}>
      <View className="flex-row flex-wrap items-center gap-md">
        {series.map((spec, index) => (
          <View key={spec.id} className="flex-row items-center gap-xs">
            <View
              className="h-sm w-sm rounded-sm"
              style={{ backgroundColor: colors[index] }}
              accessibilityElementsHidden
            />
            <Text variant="small">{spec.label}</Text>
          </View>
        ))}
      </View>

      {empty ? <Text variant="muted">{emptyMessage}</Text> : null}

      <View className={cn("gap-lg", columns && "flex-row items-start")}>
      {rows.map((row) => {
        const group = groups.find((entry) => entry.id === row.id);
        return (
          <View key={row.id} className={cn("gap-xs", columns && "flex-1")}>
            <View className="flex-row items-center gap-sm">
              {group?.accessory}
              <Text className="font-display text-sm flex-1" numberOfLines={1}>
                {row.label}
              </Text>
              {group?.note ? <Text variant="muted">{group.note}</Text> : null}
            </View>

            {row.bars.map((bar, index) => (
              <View key={bar.seriesId} className="gap-xxs">
                <View className="flex-row items-center gap-sm">
                  <Text variant="muted" className="w-4xl" numberOfLines={1}>
                    {bar.label}
                  </Text>
                  <View className="h-md flex-1 overflow-hidden rounded-sm bg-muted">
                    <View
                      className="h-full rounded-sm"
                      style={{
                        width: `${bar.fraction * 100}%`,
                        backgroundColor: colors[index],
                      }}
                      accessibilityElementsHidden
                    />
                  </View>
                  <Text variant="small" className="w-xl text-right font-mono">
                    {bar.value}
                  </Text>
                </View>
                {showWeights && bar.weight !== undefined ? (
                  <Text variant="muted" className="pl-4xl text-xs">
                    {`mean weight ${bar.weight.toFixed(2)} · ${formatPercent(bar.weight)}`}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        );
      })}
      </View>
    </View>
  );
}
