/**
 * `POST /api/prompts/steering` — preview a character's composed system prompt
 * without saving the character.
 *
 * Body: `{ character: { steering } }` (a whole character is accepted; only the
 * steering block is read). Returns `{ prompt }`, which is `null` for a character
 * that contributes no system prompt.
 */
import { z } from "zod";

import { handle, ok, readBody } from "@/lib/api/http";
import { steeringSchema } from "@/lib/domain/character";
import { composeSteeringPrompt } from "@/lib/puzzles/characters/steering";

const bodySchema = z.object({ character: z.object({ steering: steeringSchema }) });

export type SteeringPreviewResponse = { prompt: string | null };

export const POST = handle(async (request: Request) => {
  const { character } = await readBody(request, bodySchema);
  return ok({ prompt: await composeSteeringPrompt(character) } satisfies SteeringPreviewResponse);
});
