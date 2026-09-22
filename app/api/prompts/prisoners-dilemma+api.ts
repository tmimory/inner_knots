/**
 * `POST /api/prompts/prisoners-dilemma` — the round-one prompt for each player.
 *
 * The two players see different prompts: relationships are per-side, in an
 * asymmetric game a player may be shown only their own consequences, and the
 * closing instructions follow the character in the seat — a TypeSafe player is
 * never told about a response format, a tool-calling one is told to call the
 * tool. Both are returned so the Prompt View can show them side by side.
 *
 * The style is derived here rather than sent, from `playerA` / `playerB` through
 * the character store, which is exactly what a run does. A seat that is empty —
 * or an id the store no longer knows — falls back to the request's
 * `decisionStyle`, which defaults to structured.
 *
 * Body: `{ config }` (the puzzle config; `playerA`, `playerB`, `runs` and
 * `iterations` may be omitted while previewing). Returns `{ a, b, decisionStyles }`.
 */
import { z } from "zod";

import { handle, ok, readBody } from "@/lib/api/http";
import { previewDecisionStyle, previewDecisionStyleSchema } from "@/lib/api/schemas";
import { characterIdSchema } from "@/lib/domain/character";
import type { DecisionStyle } from "@/lib/domain/enums";
import { prisonersDilemmaConfigSchema, runCountSchema } from "@/lib/domain/run";
import { buildPrisonersDilemmaPrompt } from "@/lib/puzzles/prisoners-dilemma/prompt";
import type { PuzzlePrompt } from "@/lib/puzzles/types";
import { characters } from "@/lib/storage/collections";

const bodySchema = z.object({
  config: prisonersDilemmaConfigSchema.extend({
    playerA: characterIdSchema.default("playerA"),
    playerB: characterIdSchema.default("playerB"),
    runs: runCountSchema.default(1),
    iterations: prisonersDilemmaConfigSchema.shape.iterations.default(1),
    decisionStyle: previewDecisionStyleSchema,
  }),
});

export type PrisonersDilemmaPromptResponse = {
  a: PuzzlePrompt;
  b: PuzzlePrompt;
  /** What each side was composed with, so the sheet can say it in words. */
  decisionStyles: { a: DecisionStyle; b: DecisionStyle };
};

export const POST = handle(async (request: Request) => {
  const { config } = await readBody(request, bodySchema);

  const [playerA, playerB] = await Promise.all([
    characters.get(config.playerA),
    characters.get(config.playerB),
  ]);
  const decisionStyles = {
    a: previewDecisionStyle(playerA, config.decisionStyle),
    b: previewDecisionStyle(playerB, config.decisionStyle),
  };

  const shared = { config, round: 1, history: [] } as const;

  return ok({
    a: await buildPrisonersDilemmaPrompt({ ...shared, player: "a", decisionStyle: decisionStyles.a }),
    b: await buildPrisonersDilemmaPrompt({ ...shared, player: "b", decisionStyle: decisionStyles.b }),
    decisionStyles,
  } satisfies PrisonersDilemmaPromptResponse);
});
