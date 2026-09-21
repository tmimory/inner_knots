/**
 * `POST /api/runs/:id/cancel` — asks a run to stop.
 *
 * Cancellation is cooperative and goes through the store. The `cancelled` event
 * written here is both the answer and the signal: the engine — which is running
 * inside the request that started it, and does not share module state with this
 * one — looks for that event between decisions, stops, and writes its own
 * `cancelled` event with the partial summary it has built. A run nobody is
 * executing (after a restart, say) is left cancelled by this write alone, so it
 * cannot be stranded. `requestCancel` is the fast path for the case where the two
 * requests do share a process; it does not replace the store.
 *
 * The response is **202** with the run as it stands, not as it will be: decisions
 * already in flight still finish, and their results are kept.
 */
import { conflict, handle, notFound, ok } from "@/lib/api/http";
import { isTerminalRunStatus } from "@/lib/domain/run";
import { requestCancel } from "@/lib/engine/registry";
import { cancelRun, getRun } from "@/lib/storage/runs";

export const POST = handle(async (_request: Request, params: Record<string, string>) => {
  const id = params.id ?? "";
  const run = await getRun(id);
  if (!run) return notFound(`No run with id "${id}".`);
  if (isTerminalRunStatus(run.status)) return conflict(`Run "${id}" is already ${run.status}.`);

  requestCancel(id);
  await cancelRun(id);
  return ok({ item: (await getRun(id)) ?? run }, 202);
});
