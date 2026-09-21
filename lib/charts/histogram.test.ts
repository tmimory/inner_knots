import { describe, expect, it } from "vitest";

import { buildHistogram } from "./histogram";

const series = [
  { id: "track1", label: "Track 1" },
  { id: "track2", label: "Track 2" },
];

describe("buildHistogram", () => {
  it("scales every bar against the longest bar in the whole chart", () => {
    const { rows, max, empty } = buildHistogram(series, [
      { id: "a", label: "A", values: { track1: 8, track2: 2 } },
      { id: "b", label: "B", values: { track1: 1, track2: 3 } },
    ]);

    expect(max).toBe(8);
    expect(empty).toBe(false);
    expect(rows[0]?.bars.map((bar) => bar.fraction)).toEqual([1, 0.25]);
    expect(rows[1]?.bars.map((bar) => bar.fraction)).toEqual([0.125, 0.375]);
  });

  it("totals each group across its series", () => {
    const { rows } = buildHistogram(series, [
      { id: "a", label: "A", values: { track1: 8, track2: 2 } },
    ]);
    expect(rows[0]?.total).toBe(10);
  });

  it("reports a chart with nothing counted as empty rather than dividing by zero", () => {
    const { rows, max, empty } = buildHistogram(series, [
      { id: "a", label: "A", values: {} },
      { id: "b", label: "B", values: { track1: 0, track2: 0 } },
    ]);

    expect(max).toBe(0);
    expect(empty).toBe(true);
    expect(rows.flatMap((row) => row.bars).every((bar) => bar.fraction === 0)).toBe(true);
    expect(rows.flatMap((row) => row.bars).every((bar) => bar.value === 0)).toBe(true);
  });

  it("keeps a bar for a series the group never mentions", () => {
    const { rows } = buildHistogram(series, [{ id: "a", label: "A", values: { track1: 4 } }]);
    expect(rows[0]?.bars).toHaveLength(2);
    expect(rows[0]?.bars[1]).toMatchObject({ seriesId: "track2", value: 0, fraction: 0 });
  });

  it("treats a negative or non-finite count as nothing", () => {
    const { rows, max } = buildHistogram(series, [
      { id: "a", label: "A", values: { track1: -3, track2: Number.NaN } },
    ]);
    expect(max).toBe(0);
    expect(rows[0]?.total).toBe(0);
  });

  it("carries the reported weights through, including a genuine zero", () => {
    const { rows } = buildHistogram(series, [
      {
        id: "a",
        label: "A",
        values: { track1: 3, track2: 1 },
        weights: { track1: 0.71, track2: 0 },
      },
      { id: "b", label: "B", values: { track1: 1, track2: 1 } },
    ]);

    expect(rows[0]?.bars.map((bar) => bar.weight)).toEqual([0.71, 0]);
    expect(rows[1]?.bars.map((bar) => bar.weight)).toEqual([undefined, undefined]);
  });

  it("keeps the rows in the order the caller gave them", () => {
    const { rows } = buildHistogram(series, [
      { id: "z", label: "Z", values: { track1: 1 } },
      { id: "a", label: "A", values: { track1: 9 } },
    ]);
    expect(rows.map((row) => row.id)).toEqual(["z", "a"]);
  });

  it("handles a chart with no groups at all", () => {
    expect(buildHistogram(series, [])).toEqual({ rows: [], max: 0, empty: true });
  });
});
