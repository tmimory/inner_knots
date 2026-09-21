import { describe, expect, it } from "vitest";

import { DEFAULT_POLL_MS, POLL_ERROR_BACKOFF, nextPollDelay } from "./poll-schedule";

describe("nextPollDelay", () => {
  it("re-reads at the interval while the value can still change", () => {
    expect(nextPollDelay(1000, "active")).toBe(1000);
  });

  it("stops once the value has settled", () => {
    expect(nextPollDelay(1000, "settled")).toBeNull();
  });

  it("backs off after a failed read rather than giving up", () => {
    expect(nextPollDelay(1000, "error")).toBe(1000 * POLL_ERROR_BACKOFF);
  });

  it("reads once and stops when polling is disabled", () => {
    for (const outcome of ["active", "settled", "error"] as const) {
      expect(nextPollDelay(0, outcome)).toBeNull();
      expect(nextPollDelay(-1, outcome)).toBeNull();
    }
  });

  it("polls once a second by default, fast enough to animate a run", () => {
    expect(DEFAULT_POLL_MS).toBe(1000);
  });
});
