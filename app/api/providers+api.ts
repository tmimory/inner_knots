/**
 * The provider roster. Returns all five providers with whether each is configured,
 * so the Characters screen can show a disabled provider and say why rather than
 * hiding it. No key ever leaves this process; `enabled` is presence, not value.
 */
import { listProviders, type ProviderSummary } from "@/lib/providers/factory";

export type ProvidersResponse = {
  providers: ProviderSummary[];
};

export function GET(): Response {
  return Response.json({ providers: listProviders() } satisfies ProvidersResponse);
}
