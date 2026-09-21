/**
 * `GET /api/runs` — the run index, newest first.
 * `POST /api/runs` — starts a run and answers before it has finished.
 *
 * Query on GET: `puzzle`, `characterId`, `status`, `limit`. Returns `{ items: Run[] }`.
 *
 * POST takes `{ config: RunConfig }`, validates it, resolves everything it names
 * (characters, trolley objects, the adventure and its structure) and answers
 * **202** with the queued run. Execution continues in this process, writing
 * spans, logs, progress and a partial summary as it goes, so the client polls
 * `GET /api/runs/:id` rather than holding a request open for minutes. A config
 * that names something missing is a 400 naming it, before any run is created.
 */
import { z } from "zod";

import { badRequest, enumParam, handle, intParam, ok, query, readBody } from "@/lib/api/http";
import { PUZZLE_IDS, RUN_STATUSES, runConfigSchema } from "@/lib/domain/run";
import { startBackgroundRun } from "@/lib/engine/registry";
import { RunSetupError, prepareRun } from "@/lib/engine/setup";
import { createRun, listRuns } from "@/lib/storage/runs";

const startBodySchema = z.object({ config: runConfigSchema });

export const GET = handle(async (request: Request) => {
  const params = query(request);
  const runs = await listRuns({
    puzzle: enumParam(params, "puzzle", PUZZLE_IDS),
    status: enumParam(params, "status", RUN_STATUSES),
    characterId: params.get("characterId") ?? undefined,
    limit: intParam(params, "limit"),
  });
  return ok({ items: runs });
});

export const POST = handle(async (request: Request) => {
  const { config } = await readBody(request, startBodySchema);

  let total: number;
  try {
    ({ total } = await prepareRun(config));
  } catch (error) {
    if (error instanceof RunSetupError) return badRequest(error.message);
    throw error;
  }

  const run = await createRun({ config, total });
  startBackgroundRun(run);
  return ok({ item: run }, 202);
});
