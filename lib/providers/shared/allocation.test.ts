import { describe, expect, it } from "vitest";
import { buildDecisionTool, buildStrictDecisionSchema, parseChoice } from "./decision-schema";
import { buildChatBody, parseChatCompletion } from "./openai-chat";
import { buildResponsesBody } from "../openai";
import { buildMessagesBody } from "../anthropic";
import type { DecisionRequest } from "../types";

const allocationConstraints = { availableQuantity: 7, customers: [{ id: "a", orderedQuantity: 8 }, { id: "b", orderedQuantity: 6 }] };
const options = [{ id: "allocate", label: "Allocate" }, { id: "raise-prices", label: "Raise prices" }];
const allocations = [{ customerId: "a", quantity: 3 }, { customerId: "b", quantity: 4 }];
const request: DecisionRequest = { model: "mock", messages: [{ role: "user", content: "Allocate" }], options, outputMode: "structured", allocationConstraints };

describe("complete allocation responses", () => {
  it("parses complete allocations from both JSON text and tool arguments", () => {
    const payload = { choice: "allocate", allocations };
    expect(parseChoice(JSON.stringify(payload), options, "openai", allocationConstraints)).toMatchObject(payload);
    expect(parseChatCompletion({ choices: [{ message: { tool_calls: [{ function: { name: "choose", arguments: JSON.stringify(payload) } }] } }] }, options, "local", allocationConstraints)).toMatchObject(payload);
    expect(parseChatCompletion({ choices: [{ message: { content: JSON.stringify(payload) } }] }, options, "openrouter", allocationConstraints)).toMatchObject(payload);
  });
  it.each([
    [], [{ customerId: "a", quantity: 7 }],
    [{ customerId: "a", quantity: 3 }, { customerId: "a", quantity: 4 }],
    [{ customerId: "a", quantity: 3 }, { customerId: "unknown", quantity: 4 }],
    [{ customerId: "a", quantity: -1 }, { customerId: "b", quantity: 8 }],
    [{ customerId: "a", quantity: 3.5 }, { customerId: "b", quantity: 3.5 }],
    [{ customerId: "a", quantity: 0 }, { customerId: "b", quantity: 7 }],
    [{ customerId: "a", quantity: 3 }, { customerId: "b", quantity: 3 }],
  ])("rejects malformed, over-order, and wrong-total allocations: %j", (...entries) => {
    expect(() => parseChoice({ choice: "allocate", allocations: entries }, options, "local", allocationConstraints)).toThrow();
  });
  it("requires an empty array when raising prices", () => {
    expect(parseChoice({ choice: "raise-prices", allocations: [] }, options, "local", allocationConstraints).allocations).toEqual([]);
    expect(() => parseChoice({ choice: "raise-prices", allocations }, options, "local", allocationConstraints)).toThrow(/empty/);
    expect(() => parseChoice({ choice: "allocate" }, options, "local", allocationConstraints)).toThrow(/array/);
  });
  it("allows zero stock and all fifteen customers in one answer", () => {
    const customers = Array.from({ length: 15 }, (_, index) => ({ id: String(index), orderedQuantity: 100 }));
    const entries = customers.map(({ id }) => ({ customerId: id, quantity: 0 }));
    expect(parseChoice({ choice: "allocate", allocations: entries }, options, "local", { customers, availableQuantity: 0 }).allocations).toEqual(entries);
  });
  it("carries allocation schema through every provider dialect and output mode", () => {
    const strict = buildStrictDecisionSchema(options, allocationConstraints);
    expect(strict.required).toContain("allocations");
    expect(buildResponsesBody(request)).toMatchObject({ text: { format: { schema: strict } } });
    expect(buildMessagesBody(request).body).toMatchObject({ output_config: { format: { schema: strict } } });
    expect(buildChatBody({ ...request, maxTokens: 1000 })).toMatchObject({ response_format: { json_schema: { schema: strict } } });
    const tool = buildDecisionTool(options, false, allocationConstraints);
    expect(buildResponsesBody({ ...request, outputMode: "tool" })).toMatchObject({ tools: [{ parameters: strict }] });
    expect(buildMessagesBody({ ...request, outputMode: "tool" }).body).toMatchObject({ tools: [{ input_schema: tool.parameters }] });
    expect(buildChatBody({ ...request, outputMode: "tool", maxTokens: 1000 })).toMatchObject({ tools: [{ function: { parameters: tool.parameters } }] });
    const fallback = buildChatBody({ ...request, maxTokens: 1000, structuredVia: "json_object" });
    expect(JSON.stringify(fallback.messages)).toContain("allocations");
  });
});
