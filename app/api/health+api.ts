/**
 * Liveness probe for the local backend. Screens call this to show whether the
 * Expo Router API layer (which holds the keys and the JSONL store) is running.
 */
export type HealthResponse = {
  ok: boolean;
  time: string;
};

export function GET(): Response {
  return Response.json({ ok: true, time: new Date().toISOString() } satisfies HealthResponse);
}
