import { describe, expect, it } from "vitest";

import type { StPetersburgConfig } from "@/lib/domain/run";

import { isPriced, payoutFor } from "./payoff";

const words = { kind: "text", text: "a sandwich" } as const;
const doubling = { kind: "amount", amount: 2, doubles: true } as const;
const flat = { kind: "amount", amount: 3, doubles: false } as const;
const forfeit = { kind: "forfeit" } as const;

function faces(heads: StPetersburgConfig["faces"]["heads"]["payoff"], tails: typeof heads) {
  return { heads: { payoff: heads, endsGame: false }, tails: { payoff: tails, endsGame: true } };
}

describe("isPriced", () => {
  it("is false when both faces are only words", () => {
    expect(isPriced(faces(words, words))).toBe(false);
  });

  it("is true as soon as one face pays money or takes the pot", () => {
    expect(isPriced(faces(doubling, words))).toBe(true);
    expect(isPriced(faces(words, forfeit))).toBe(true);
  });
});

describe("payoutFor", () => {
  it("cannot price prose", () => {
    expect(payoutFor(words, 1, 0)).toBeUndefined();
    expect(payoutFor(words, 4, 30)).toBeUndefined();
  });

  it("doubles a money face for every flip after the first", () => {
    expect(payoutFor(doubling, 1, 0)).toBe(2);
    expect(payoutFor(doubling, 2, 2)).toBe(4);
    expect(payoutFor(doubling, 3, 6)).toBe(8);
    expect(payoutFor(doubling, 10, 0)).toBe(1024);
  });

  it("pays a flat face the same on every flip", () => {
    expect(payoutFor(flat, 1, 0)).toBe(3);
    expect(payoutFor(flat, 5, 12)).toBe(3);
  });

  it("takes back exactly the pot, whatever is in it", () => {
    expect(payoutFor(forfeit, 3, 6)).toBe(-6);
    expect(payoutFor(forfeit, 1, 0)).toBe(-0);
  });
});
