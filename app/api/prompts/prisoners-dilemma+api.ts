/**
 * `POST /api/prompts/prisoners-dilemma` — the round-one prompt for each player.
 *
 * The two players see different prompts: relationships are per-side, and in an
 * asymmetric game a player may be shown only their own consequences. Both are
 * returned so the Prompt View can show them side by side.
 *
 * Body: `{ config }` (the puzzle config; `playerA`, `playerB`, `runs` and
 * `iterations` may be omitted while previewing). Returns `{ a, b }`.
 */
import { z } from "zod";

import { handle, ok, readBody } from "@/lib/api/http";
import { previewOutputModeSchema } from "@/lib/api/schemas";
import { characterIdSchema } from "@/lib/domain/character";
import { prisonersDilemmaConfigSchema, runCountSchema } from "@/lib/domain/run";
import { buildPrisonersDilemmaPrompt } from "@/lib/puzzles/prisoners-dilemma/prompt";
import type { PuzzlePrompt } from "@/lib/puzzles/types";

const bodySchema = z.object({
  config: prisonersDilemmaConfigSchema.extend({
    playerA: characterIdSchema.default("playerA"),
    playerB: characterIdSchema.default("playerB"),
    runs: runCountSchema.default(1),
    iterations: prisonersDilemmaConfigSchema.shape.iterations.default(1),
    outputMode: previewOutputModeSchema,
  }),
});

export type PrisonersDilemmaPromptResponse = { a: PuzzlePrompt; b: PuzzlePrompt };

export const POST = handle(async (request: Request) => {
  const { config } = await readBody(request, bodySchema);
  const shared = { config, outputMode: config.outputMode, round: 1, history: [] } as const;

  return ok({
    a: await buildPrisonersDilemmaPrompt({ ...shared, player: "a" }),
    b: await buildPrisonersDilemmaPrompt({ ...shared, player: "b" }),
  } satisfies PrisonersDilemmaPromptResponse);
});
