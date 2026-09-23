/**
 * `POST /api/prompts/st-petersburg` — the first turn's prompt for a coin.
 *
 * A preview is always flip 1 with nothing behind it: the voice's terms and the
 * limit are the whole of what the user is configuring, and every later turn adds
 * only the list of faces the coin has already shown. The roster plays no part in
 * the prompt, so it is omitted from the body rather than ignored.
 *
 * Body: `{ config: { faces: { heads, tails }, maxFlips, decisionStyle? } }`
 * Returns: `{ prompt: { user, options, question } }`
 */
import { z } from "zod";

import { handle, ok, readBody } from "@/lib/api/http";
import { previewDecisionStyleSchema } from "@/lib/api/schemas";
import { stPetersburgConfigSchema } from "@/lib/domain/run";
import { buildStPetersburgPrompt } from "@/lib/puzzles/st-petersburg/prompt";
import type { PuzzlePrompt } from "@/lib/puzzles/types";

const bodySchema = z.object({
  config: stPetersburgConfigSchema
    .omit({ roster: true })
    .extend({ decisionStyle: previewDecisionStyleSchema }),
});

export type StPetersburgPromptResponse = { prompt: PuzzlePrompt };

export const POST = handle(async (request: Request) => {
  const { config } = await readBody(request, bodySchema);

  const prompt = await buildStPetersburgPrompt({
    config: { faces: config.faces, maxFlips: config.maxFlips },
    decisionStyle: config.decisionStyle,
    flip: 1,
    history: [],
  });

  return ok({ prompt } satisfies StPetersburgPromptResponse);
});
