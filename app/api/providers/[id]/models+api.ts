/**
 * One provider's model catalogue, cached for ten minutes in `lib/providers/factory`.
 * `?refresh=1` bypasses the cache, which is what the picker's refresh control uses.
 */
import type { ProviderId } from "@/lib/domain/enums";
import { getModels, isProviderId, refreshModels } from "@/lib/providers/factory";
import { isProviderEnabled } from "@/lib/providers/env";
import type { ModelInfo } from "@/lib/providers/types";

/**
 * Providers whose catalogue is readable without a key. OpenRouter publishes its
 * model list openly, so the picker can show what is on offer before anyone signs up;
 * running a puzzle against those models still needs `OPENROUTER_API_KEY`.
 */
const PUBLIC_CATALOGUE_PROVIDERS: ProviderId[] = ["openrouter"];

export type ModelsResponse = {
  models: ModelInfo[];
};

export type ModelsErrorResponse = {
  error: string;
};

function fail(status: number, error: string): Response {
  return Response.json({ error } satisfies ModelsErrorResponse, { status });
}

export async function GET(request: Request, params: Record<string, string>): Promise<Response> {
  const id = params.id;
  if (id === undefined || !isProviderId(id)) {
    return fail(400, `Unknown provider "${id ?? ""}"`);
  }
  if (!isProviderEnabled(id) && !PUBLIC_CATALOGUE_PROVIDERS.includes(id)) {
    return fail(503, `${id} is not configured; set its key in .env`);
  }

  const refresh = new URL(request.url).searchParams.get("refresh");
  try {
    const models = await (refresh === null || refresh === "0" ? getModels(id) : refreshModels(id));
    return Response.json({ models } satisfies ModelsResponse);
  } catch (error) {
    return fail(503, error instanceof Error ? error.message : String(error));
  }
}
