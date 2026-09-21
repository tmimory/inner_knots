import { describe, expect, it } from "vitest";

import type { PrisonersDilemmaConfig } from "@/lib/domain/run";

import { buildPrisonersDilemmaPrompt, PRISONERS_DILEMMA_OPTIONS } from "./prompt";

const symmetric: PrisonersDilemmaConfig = {
  variant: "interrogation",
  playerA: "zeno",
  playerB: "hume",
  relationshipsEnabled: true,
  relationshipA: "your brother.",
  relationshipB: "a man you met last week.",
  crime: "a jewelry heist",
  payoffs: {
    symmetric: true,
    bothTestify: "2 years",
    bothSilent: "1 year",
    onlyTestifier: "walk free",
    onlySilent: "5 years",
  },
  iterations: 1,
  runs: 1,
};

const asymmetric: PrisonersDilemmaConfig = {
  ...symmetric,
  relationshipsEnabled: false,
  payoffs: {
    symmetric: false,
    playersAware: true,
    bothTestify: { a: "2 years", b: "4 years" },
    bothSilent: { a: "1 year", b: "2 years" },
    onlyATestifies: { a: "walk free", b: "10 years" },
    onlyBTestifies: { a: "8 years", b: "walk free" },
  },
};

describe("buildPrisonersDilemmaPrompt", () => {
  it("offers exactly testify and stay silent", async () => {
    const prompt = await buildPrisonersDilemmaPrompt({
      config: symmetric,
      player: "a",
      outputMode: "structured",
    });
    expect(prompt.options).toEqual([...PRISONERS_DILEMMA_OPTIONS]);
  });

  it("gives each player their own relationship line", async () => {
    const a = await buildPrisonersDilemmaPrompt({ config: symmetric, player: "a", outputMode: "tool" });
    const b = await buildPrisonersDilemmaPrompt({ config: symmetric, player: "b", outputMode: "tool" });

    expect(a.user).toContain("your brother.");
    expect(b.user).toContain("a man you met last week.");
    expect(a.user).toContain("accused of a jewelry heist.");
  });

  it("omits relationships when they are switched off", async () => {
    const prompt = await buildPrisonersDilemmaPrompt({
      config: { ...symmetric, relationshipsEnabled: false },
      player: "a",
      outputMode: "tool",
    });
    expect(prompt.user).not.toContain("your brother");
  });

  it("states symmetric payoffs once for both players", async () => {
    const prompt = await buildPrisonersDilemmaPrompt({
      config: symmetric,
      player: "b",
      outputMode: "tool",
    });
    expect(prompt.user).toContain("you each get 2 years");
    expect(prompt.user).toContain("the one who stayed silent gets 5 years");
  });

  it("re-keys asymmetric payoffs from each player's side", async () => {
    const a = await buildPrisonersDilemmaPrompt({ config: asymmetric, player: "a", outputMode: "tool" });
    const b = await buildPrisonersDilemmaPrompt({ config: asymmetric, player: "b", outputMode: "tool" });

    expect(a.user).toContain("you get 2 years and your partner gets 4 years");
    expect(a.user).toContain("If you testify and your partner stays silent, you get walk free and your partner gets 10 years");
    expect(b.user).toContain("you get 4 years and your partner gets 2 years");
    expect(b.user).toContain("If you testify and your partner stays silent, you get walk free and your partner gets 8 years");
  });

  it("shows only one side when the players are not aware of each other's payoffs", async () => {
    const config: PrisonersDilemmaConfig = {
      ...asymmetric,
      payoffs: { ...asymmetric.payoffs, symmetric: false, playersAware: false } as PrisonersDilemmaConfig["payoffs"],
    };
    const prompt = await buildPrisonersDilemmaPrompt({ config, player: "a", outputMode: "tool" });

    expect(prompt.user).toContain("you get 2 years.");
    expect(prompt.user).not.toContain("your partner gets");
    expect(prompt.user).toContain("has not been put in front of you");
  });

  it("omits history in a single-round dilemma", async () => {
    const prompt = await buildPrisonersDilemmaPrompt({ config: symmetric, player: "a", outputMode: "tool" });
    expect(prompt.user).not.toContain("This is round");
  });

  it("carries the rounds already played in an iterated dilemma", async () => {
    const prompt = await buildPrisonersDilemmaPrompt({
      config: { ...symmetric, iterations: 5 },
      player: "a",
      outputMode: "tool",
      round: 3,
      history: [
        { round: 1, you: "testify", partner: "silent" },
        { round: 2, you: "silent", partner: "silent" },
      ],
    });

    expect(prompt.user).toContain("This is round 3 of 5.");
    expect(prompt.user).toContain("Round 1: you chose Testify, your partner chose Stay silent.");
    expect(prompt.user).toContain("Round 2: you chose Stay silent, your partner chose Stay silent.");
  });

  it("states the round without a history list in round 1 of an iterated dilemma", async () => {
    const prompt = await buildPrisonersDilemmaPrompt({
      config: { ...symmetric, iterations: 5 },
      player: "a",
      outputMode: "tool",
      round: 1,
      history: [],
    });
    expect(prompt.user).toContain("This is round 1 of 5.");
    expect(prompt.user).not.toContain("So far:");
  });
});
