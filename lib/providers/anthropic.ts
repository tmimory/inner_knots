/**
 * Anthropic, through the Messages API.
 *
 * Two generations of reasoning control coexist here. Current models take
 * `output_config.effort`, a named level; older thinking-capable models take
 * `thinking.budget_tokens`, a number that must be at least 1024 and must fit inside
 * `max_tokens`. Since this app clamps output tokens hard, a budget can be
 * impossible — in that case the call goes out without thinking and the trace records
 * that the effort was dropped, rather than failing the run or silently overspending.
 */
import Anthropic from "@anthropic-ai/sdk";

import type { EffortLevel, ProviderId } from "../domain/enums";
import { clampMaxTokens } from "./clamp";
import { requireApiKey } from "./env";
import {
  DECISION_TOOL_NAME,
  buildDecisionSchema,
  buildDecisionTool,
  buildStrictDecisionSchema,
  parseChoice,
} from "./shared/decision-schema";
import { asRecord, readTokenUsage } from "./shared/http";
import { splitSystem } from "./shared/messages";
import { buildDecisionRecord, createTracer, type Tracer } from "./shared/trace";
import {
  ProviderError,
  type DecisionRecord,
  type DecisionRequest,
  type ModelInfo,
  type ProviderAdapter,
  type TraceContext,
} from "./types";

const PROVIDER: ProviderId = "anthropic";
const LABEL = "Anthropic";

/** Models that take `output_config.effort`. */
const EFFORT_PARAM_PATTERN = /^claude-(opus-4-[5-9]|sonnet-4-[6-9]|haiku-4-[5-9]|[a-z]+-[5-9])/;
/** Older models that only have extended thinking. */
const THINKING_PATTERN = /^claude-(3-7|opus-4|sonnet-4|haiku-4)/;

/** Anthropic rejects a thinking budget below this. */
export const MIN_THINKING_BUDGET = 1024;
/** Tokens the answer itself needs on top of the thinking budget. */
export const THINKING_HEADROOM = 64;

const THINKING_BUDGETS: Record<Exclude<EffortLevel, "none">, number> = {
  low: MIN_THINKING_BUDGET,
  medium: 2048,
  high: 4096,
};

function client(): Anthropic {
  return new Anthropic({ apiKey: requireApiKey(PROVIDER) });
}

/** Which reasoning control, if any, a model id understands. */
export function effortStyle(model: string): "output_config" | "thinking" | "none" {
  if (EFFORT_PARAM_PATTERN.test(model)) return "output_config";
  if (THINKING_PATTERN.test(model)) return "thinking";
  return "none";
}

function contentBlocks(response: unknown): Record<string, unknown>[] {
  const content = asRecord(response)?.content;
  if (!Array.isArray(content)) return [];
  return content.map(asRecord).filter((block): block is Record<string, unknown> => block !== undefined);
}

function readToolInput(response: unknown): unknown {
  for (const block of contentBlocks(response)) {
    if (block.type !== "tool_use") continue;
    if (block.name !== undefined && block.name !== DECISION_TOOL_NAME) continue;
    return block.input;
  }
  return undefined;
}

function readText(response: unknown): string | undefined {
  const parts: string[] = [];
  for (const block of contentBlocks(response)) {
    if (block.type === "text" && typeof block.text === "string") parts.push(block.text);
  }
  const joined = parts.join("");
  return joined.trim() === "" ? undefined : joined;
}

type MessagesBody = Record<string, unknown>;

/** The forced `choose` tool, used by tool mode and by the structured fallback. */
function withForcedTool(body: MessagesBody, req: DecisionRequest): MessagesBody {
  const tool = buildDecisionTool(req.options);
  return {
    ...body,
    tools: [{ name: tool.name, description: tool.description, input_schema: buildDecisionSchema(req.options) }],
    tool_choice: { type: "tool", name: tool.name },
  };
}

/** What effort resolved to, plus the reason when it could not be honoured. */
export type EffortPlan = {
  outputConfigEffort?: EffortLevel;
  thinking?: { type: "enabled"; budget_tokens: number };
  dropped?: string;
};

/** Resolves our effort level against the model and the output-token ceiling. */
export function planEffort(model: string, effort: EffortLevel | undefined, maxTokens: number): EffortPlan {
  if (effort === undefined || effort === "none") return {};
  const style = effortStyle(model);
  if (style === "output_config") return { outputConfigEffort: effort };
  if (style === "none") return { dropped: `${model} has no reasoning control` };

  const budget = THINKING_BUDGETS[effort];
  if (maxTokens < budget + THINKING_HEADROOM) {
    return { dropped: `thinking budget ${budget} does not fit in max_tokens ${maxTokens}` };
  }
  return { thinking: { type: "enabled", budget_tokens: budget } };
}

/** The exact body, built as a plain object so the trace records what was sent. */
export function buildMessagesBody(req: DecisionRequest): { body: MessagesBody; plan: EffortPlan } {
  const maxTokens = clampMaxTokens(req.maxTokens);
  const { system, messages } = splitSystem(req.system, req.messages);
  const plan = planEffort(req.model, req.effort, maxTokens);

  let body: MessagesBody = { model: req.model, max_tokens: maxTokens, messages };
  if (system !== undefined) body.system = system;
  if (plan.thinking) body.thinking = plan.thinking;

  if (req.outputMode === "structured") {
    const outputConfig: Record<string, unknown> = {
      format: { type: "json_schema", schema: buildStrictDecisionSchema(req.options) },
    };
    if (plan.outputConfigEffort) outputConfig.effort = plan.outputConfigEffort;
    body.output_config = outputConfig;
    return { body, plan };
  }

  body = withForcedTool(body, req);
  if (plan.outputConfigEffort) body.output_config = { effort: plan.outputConfigEffort };
  return { body, plan };
}

/** True when the account or model rejected native structured output specifically. */
function isOutputFormatUnsupported(error: unknown): boolean {
  if (!(error instanceof ProviderError)) return false;
  if (error.status !== 400 && error.status !== 404 && error.status !== 422) return false;
  return /output_config|output_format|json_schema|structured/i.test(error.message);
}

async function callStructured(
  tracer: Tracer,
  api: Anthropic,
  req: DecisionRequest,
  body: MessagesBody,
  plan: EffortPlan,
): Promise<{ response: unknown; viaForcedTool: boolean }> {
  const create = (payload: MessagesBody, note?: Record<string, unknown>): Promise<unknown> =>
    tracer.run(payload, () => api.messages.create(payload as unknown as Parameters<Anthropic["messages"]["create"]>[0]), {
      requestNote: note,
    });

  const note = plan.dropped === undefined ? undefined : { effortDropped: plan.dropped };
  try {
    return { response: await create(body, note), viaForcedTool: false };
  } catch (error) {
    if (!isOutputFormatUnsupported(error)) throw error;
    // The model cannot promise a schema, so force the tool and say so in the log.
    const { output_config: outputConfig, ...rest } = body;
    const effort = asRecord(outputConfig)?.effort;
    const fallback = withForcedTool(rest, req);
    if (effort !== undefined) fallback.output_config = { effort };
    return {
      response: await create(fallback, { ...note, structuredVia: "forced-tool" }),
      viaForcedTool: true,
    };
  }
}

export function createAnthropicAdapter(): ProviderAdapter {
  return {
    id: PROVIDER,
    label: LABEL,

    async listModels(): Promise<ModelInfo[]> {
      const page = await client().models.list({ limit: 100 });
      return page.data.map((model) => {
        const capabilities = model.capabilities;
        const effort: EffortLevel[] = capabilities
          ? (["low", "medium", "high"] as const).filter((level) => capabilities.effort[level].supported)
          : effortStyle(model.id) === "none"
            ? []
            : ["low", "medium", "high"];
        const contextWindow = model.max_input_tokens;
        return {
          id: model.id,
          label: model.display_name ?? model.id,
          capabilities: {
            structuredOutput: capabilities ? capabilities.structured_outputs.supported : true,
            toolCalls: true,
            effort,
            ...(typeof contextWindow === "number" ? { contextWindow } : {}),
          },
        };
      });
    },

    async decide(req: DecisionRequest, ctx?: TraceContext): Promise<DecisionRecord> {
      const tracer = createTracer({ provider: PROVIDER, model: req.model, outputMode: req.outputMode }, ctx);
      const api = client();
      const { body, plan } = buildMessagesBody(req);

      let response: unknown;
      let viaForcedTool = req.outputMode === "tool";
      if (req.outputMode === "structured") {
        const result = await callStructured(tracer, api, req, body, plan);
        response = result.response;
        viaForcedTool = result.viaForcedTool;
      } else {
        const note = plan.dropped === undefined ? undefined : { effortDropped: plan.dropped };
        response = await tracer.run(
          body,
          () => api.messages.create(body as unknown as Parameters<Anthropic["messages"]["create"]>[0]),
          { requestNote: note },
        );
      }

      const source = viaForcedTool ? readToolInput(response) : readText(response);
      if (source === undefined) {
        const stop = asRecord(response)?.stop_reason;
        throw new ProviderError(
          PROVIDER,
          `Response carried no ${viaForcedTool ? "choose tool call" : "text content"}${
            typeof stop === "string" ? ` (stop_reason: ${stop})` : ""
          }`,
          { retryable: false },
        );
      }

      const parsed = parseChoice(source, req.options, PROVIDER);
      const usage = readTokenUsage(response, { input: "input_tokens", output: "output_tokens" });
      return buildDecisionRecord(parsed, usage, tracer);
    },
  };
}
