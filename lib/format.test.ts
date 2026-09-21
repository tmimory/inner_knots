import { describe, expect, it } from "vitest";

import {
  UNKNOWN,
  countNote,
  dayKey,
  durationBetween,
  formatDay,
  formatDuration,
  formatElapsed,
  formatPercent,
  formatTime,
  pluralize,
  truncate,
} from "./format";

describe("formatDuration", () => {
  it("counts milliseconds below a second", () => {
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(840)).toBe("840ms");
  });

  it("switches to seconds, then minutes, then hours", () => {
    expect(formatDuration(3_400)).toBe("3.4s");
    expect(formatDuration(125_000)).toBe("2m 05s");
    expect(formatDuration(4_320_000)).toBe("1h 12m");
  });

  it("rolls a rounded-up remainder into the larger unit", () => {
    expect(formatDuration(119_600)).toBe("2m 00s");
    expect(formatDuration(7_198_000)).toBe("2h 00m");
  });

  it("refuses to invent a duration it cannot read", () => {
    expect(formatDuration(Number.NaN)).toBe(UNKNOWN);
    expect(formatDuration(-1)).toBe(UNKNOWN);
  });
});

describe("durationBetween", () => {
  it("measures between two instants", () => {
    expect(durationBetween("2026-09-21T10:00:00.000Z", "2026-09-21T10:00:02.500Z")).toBe(2_500);
  });

  it("measures to now when nothing has ended yet", () => {
    const elapsed = durationBetween(new Date().toISOString());
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  it("is undefined for an unreadable timestamp", () => {
    expect(durationBetween("not a date")).toBeUndefined();
    expect(formatElapsed("not a date")).toBe(UNKNOWN);
  });
});

describe("formatTime and formatDay", () => {
  it("reports an unreadable timestamp rather than throwing", () => {
    expect(formatTime("nonsense")).toBe(UNKNOWN);
    expect(formatDay("nonsense")).toBe(UNKNOWN);
    expect(dayKey("nonsense")).toBe(UNKNOWN);
  });

  it("names today and yesterday", () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(formatDay(now.toISOString())).toBe("Today");
    expect(formatDay(yesterday.toISOString())).toBe("Yesterday");
  });

  it("keys a day by its local calendar date", () => {
    const iso = new Date(2026, 8, 21, 13, 45).toISOString();
    expect(dayKey(iso)).toBe("2026-09-21");
  });

  it("sorts day keys chronologically as strings", () => {
    expect(dayKey(new Date(2026, 0, 2).toISOString()) > dayKey(new Date(2025, 11, 31).toISOString())).toBe(
      true,
    );
  });
});

describe("formatPercent", () => {
  it("renders a fraction as a percentage", () => {
    expect(formatPercent(0.425)).toBe("43%");
    expect(formatPercent(0.425, 1)).toBe("42.5%");
    expect(formatPercent(1)).toBe("100%");
  });

  it("refuses a value it cannot read", () => {
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe(UNKNOWN);
  });
});

describe("truncate", () => {
  it("leaves short text alone", () => {
    expect(truncate("short", 10)).toBe("short");
  });

  it("counts the ellipsis inside the budget", () => {
    expect(truncate("abcdefghij", 5)).toBe("abcd…");
    expect(truncate("abcdefghij", 5)).toHaveLength(5);
  });

  it("returns nothing when there is no room", () => {
    expect(truncate("abc", 0)).toBe("");
  });
});

describe("pluralize", () => {
  it("keeps the singular at one and pluralizes everything else", () => {
    expect(pluralize(1, "node")).toBe("1 node");
    expect(pluralize(0, "node")).toBe("0 nodes");
    expect(pluralize(2, "node")).toBe("2 nodes");
  });

  it("takes an irregular plural when the default will not do", () => {
    expect(pluralize(1, "person", "people")).toBe("1 person");
    expect(pluralize(3, "person", "people")).toBe("3 people");
  });
});

describe("countNote", () => {
  it("says nothing at zero", () => {
    expect(countNote(0, "error")).toBeUndefined();
  });

  it("counts from one upwards", () => {
    expect(countNote(1, "error")).toBe("1 error");
    expect(countNote(4, "error")).toBe("4 errors");
    expect(countNote(2, "ending", "endings")).toBe("2 endings");
  });
});
