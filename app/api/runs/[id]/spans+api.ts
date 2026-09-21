/**
 * `GET /api/runs/:id/spans` — every span of a run, merged by span id.
 *
 * Each span carries the exact request that was sent to the provider and the raw
 * response that came back, which is what the run detail screen shows.
 */
import { handle, ok } from "@/lib/api/http";
import { listSpans } from "@/lib/storage/runs";

export const GET = handle(async (_request: Request, params: Record<string, string>) => {
  return ok({ items: await listSpans(params.id ?? "") });
});
