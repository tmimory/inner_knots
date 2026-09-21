/** `GET /api/runs/:id` — one run, including its summary once it has finished. */
import { handle, notFound, ok } from "@/lib/api/http";
import { getRun } from "@/lib/storage/runs";

export const GET = handle(async (_request: Request, params: Record<string, string>) => {
  const run = await getRun(params.id ?? "");
  return run ? ok({ item: run }) : notFound(`No run with id "${params.id ?? ""}".`);
});
