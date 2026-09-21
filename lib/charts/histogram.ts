/**
 * The arithmetic behind the grouped histogram.
 *
 * Kept apart from the component so the interesting part — how a bar is scaled,
 * what a group with nothing in it looks like, how a missing series reads — can be
 * tested without rendering anything. Pure, and free of React.
 */

/** One comparison line: a track, a choice, a player. */
export type HistogramSeries = {
  id: string;
  label: string;
};

/** One cluster of bars: a character, a node, a round. */
export type HistogramGroupInput = {
  id: string;
  label: string;
  /** Counts per series id. A series with no entry counts zero. */
  values: Readonly<Record<string, number>>;
  /** Mean probability mass per series id, when the provider reported one. */
  weights?: Readonly<Record<string, number>>;
};

export type HistogramBar = {
  seriesId: string;
  label: string;
  value: number;
  /** 0..1 of the chart's longest bar — what the rendered width is a fraction of. */
  fraction: number;
  /** 0..1, present only when this group reported weights for this series. */
  weight?: number;
};

export type HistogramRow = {
  id: string;
  label: string;
  /** Everything counted in this group, across all series. */
  total: number;
  bars: HistogramBar[];
};

export type Histogram = {
  rows: HistogramRow[];
  /** The longest bar in the chart; `0` when nothing has been counted yet. */
  max: number;
  /** True when no group has counted anything, so the chart is an empty frame. */
  empty: boolean;
};

/** A finite, non-negative reading of whatever was in the record. */
function count(values: Readonly<Record<string, number>>, id: string): number {
  const value = values[id];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/** A weight only counts when it is a finite number; zero is a real answer. */
function weightOf(
  weights: Readonly<Record<string, number>> | undefined,
  id: string,
): number | undefined {
  const value = weights?.[id];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Lays out the bars.
 *
 * Every bar is scaled against the longest bar in the **whole chart**, not against
 * its own group, so two characters asked a different number of times still read
 * against each other rather than each filling its own row.
 */
export function buildHistogram(
  series: readonly HistogramSeries[],
  groups: readonly HistogramGroupInput[],
): Histogram {
  let max = 0;
  for (const group of groups) {
    for (const entry of series) max = Math.max(max, count(group.values, entry.id));
  }

  const rows = groups.map((group) => {
    const bars = series.map((entry) => {
      const value = count(group.values, entry.id);
      return {
        seriesId: entry.id,
        label: entry.label,
        value,
        fraction: max === 0 ? 0 : value / max,
        weight: weightOf(group.weights, entry.id),
      } satisfies HistogramBar;
    });
    return {
      id: group.id,
      label: group.label,
      total: bars.reduce((sum, bar) => sum + bar.value, 0),
      bars,
    } satisfies HistogramRow;
  });

  return { rows, max, empty: max === 0 };
}
