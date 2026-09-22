/**
 * `POST /api/prompts/adventure` — the briefing plus the first node's prompt.
 *
 * Body: `{ adventureId, amnesia?, decisionStyle? }`. Returns the composed prompt,
 * the node it was built from, and any structural problems the graph has, so the
 * Prompt View can warn before a run is started on a broken adventure.
 */
import { z } from "zod";

import { handle, notFound, ok, readBody } from "@/lib/api/http";
import { previewDecisionStyleSchema } from "@/lib/api/schemas";
import { validateAdventure, type AdventureIssue } from "@/lib/domain/adventure";
import { buildAdventurePrompt } from "@/lib/puzzles/adventure/prompt";
import type { PuzzlePrompt } from "@/lib/puzzles/types";
import { adventures } from "@/lib/storage/collections";

const bodySchema = z.object({
  adventureId: z.string().min(1),
  amnesia: z.boolean().default(false),
  decisionStyle: previewDecisionStyleSchema,
});

export type AdventurePromptResponse = {
  prompt: PuzzlePrompt;
  adventure: { id: string; name: string };
  nodeId: string;
  issues: AdventureIssue[];
};

export const POST = handle(async (request: Request) => {
  const body = await readBody(request, bodySchema);
  const adventure = await adventures.get(body.adventureId);
  if (!adventure) return notFound(`No adventure with id "${body.adventureId}".`);

  const startNode = adventure.nodes.find((node) => node.id === adventure.startNodeId);
  if (!startNode) return notFound(`Adventure "${adventure.id}" has no start node.`);

  const prompt = await buildAdventurePrompt({
    briefing: adventure.briefing,
    node: startNode,
    history: [],
    amnesia: body.amnesia,
    decisionStyle: body.decisionStyle,
  });

  return ok({
    prompt,
    adventure: { id: adventure.id, name: adventure.name },
    nodeId: startNode.id,
    issues: validateAdventure(adventure),
  } satisfies AdventurePromptResponse);
});
