/**
 * A one-question smoke test, so a user can tell a wrong key from a wrong prompt.
 *
 * It asks the cheapest possible question through the real `decide()` path and returns
 * both the normalized answer and the raw call record, which means the same request
 * shaping, clamping and parsing a puzzle run would use is what gets verified.
 */
import type { OutputMode } from "@/lib/domain/enums";
import { errorMessage } from "@/lib/errors";
import { createProvider, isProviderId } from "@/lib/providers/factory";
import { isProviderEnabled } from "@/lib/providers/env";
import type { DecisionOption, DecisionRecord, DecisionRequest, ProviderCallRecord } from "@/lib/providers/types";

/** Deliberately trivial: any working model gets it right, so a wrong answer is news. */
export const TEST_PROMPT = "Which is larger, 3 or 7?";
export const TEST_QUESTION = "Which number is larger?";
export const TEST_OPTIONS: DecisionOption[] = [
  { id: "three", label: "Three", description: "The number 3." },
  { id: "seven", label: "Seven", description: "The number 7." },
];

export type TestProviderRequest = {
  model: string;
  outputMode?: OutputMode;
};

export type TestProviderResponse = {
  decision: DecisionRecord;
  calls: ProviderCallRecord[];
};

export type TestProviderErrorResponse = {
  error: string;
  calls: ProviderCallRecord[];
};

function fail(status: number, error: string, calls: ProviderCallRecord[] = []): Response {
  return Response.json({ error, calls } satisfies TestProviderErrorResponse, { status });
}

export async function POST(request: Request, params: Record<string, string>): Promise<Response> {
  const id = params.id;
  if (id === undefined || !isProviderId(id)) return fail(400, `Unknown provider "${id ?? ""}"`);
  if (!isProviderEnabled(id)) return fail(503, `${id} is not configured; set its key in .env`);

  let body: TestProviderRequest;
  try {
    body = (await request.json()) as TestProviderRequest;
  } catch {
    return fail(400, "Request body must be JSON");
  }
  if (typeof body?.model !== "string" || body.model.trim() === "") {
    return fail(400, "A model id is required");
  }
  const outputMode: OutputMode = body.outputMode === "tool" ? "tool" : "structured";

  const calls: ProviderCallRecord[] = [];
  const decisionRequest: DecisionRequest = {
    model: body.model.trim(),
    messages: [{ role: "user", content: TEST_PROMPT }],
    options: TEST_OPTIONS,
    outputMode,
    question: TEST_QUESTION,
  };

  try {
    const decision = await createProvider(id).decide(decisionRequest, {
      onCall: (record) => {
        calls.push(record);
      },
    });
    return Response.json({ decision, calls } satisfies TestProviderResponse);
  } catch (error) {
    return fail(503, errorMessage(error), calls);
  }
}
