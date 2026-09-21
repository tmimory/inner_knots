/**
 * `GET /api/runs/:id/logs` — the run's log lines, oldest first.
 *
 * Query: `level` to keep one level only, `limit` to keep the most recent lines.
 */
import { enumParam, handle, intParam, ok, query } from "@/lib/api/http";
import { LOG_LEVELS } from "@/lib/domain/span";
import { listLogs } from "@/lib/storage/runs";

export const GET = handle(async (request: Request, params: Record<string, string>) => {
  const search = query(request);
  const logs = await listLogs(params.id ?? "", {
    level: enumParam(search, "level", LOG_LEVELS),
    limit: intParam(search, "limit"),
  });
  return ok({ items: logs });
});
