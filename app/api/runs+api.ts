/**
 * `GET /api/runs` — the run index, newest first.
 *
 * Query: `puzzle`, `characterId`, `status`, `limit`. Returns `{ items: Run[] }`.
 *
 * TODO(phase 5): `POST /api/runs` starts a run. It will validate the puzzle
 * config, create the run via `createRun`, hand it to the engine in
 * `lib/engine/`, and return immediately with the queued run while the engine
 * writes progress, spans and logs in the background.
 */
import { enumParam, handle, intParam, ok, query } from "@/lib/api/http";
import { PUZZLE_IDS, RUN_STATUSES } from "@/lib/domain/run";
import { listRuns } from "@/lib/storage/runs";

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
