import type { DecisionStyle } from "@/lib/domain/enums";
import type { ScarceAllocationConfig, ScarceAllocationCustomer } from "@/lib/domain/scarce-allocation";
import { render } from "@/lib/prompts/compose";

import { joinSections, renderDecisionInstructions, type PromptOption, type PuzzlePrompt } from "../types";

type Range = { min: number; max: number };

function customerList(customers: readonly ScarceAllocationCustomer[]): string {
  return customers
    .map((customer, index) => `${index + 1}. ${customer.name} — ordered ${customer.orderedQuantity}\n   ${customer.description}`)
    .join("\n");
}

function framing(config: Pick<ScarceAllocationConfig, "variant" | "availableQuantity" | "timeFrame" | "customers">) {
  return render(`scarce-allocation/variant-${config.variant}`, {
    availableQuantity: config.availableQuantity,
    timeFrame: config.timeFrame,
    customers: customerList(config.customers),
  });
}

export async function buildScarceAllocationStrategyPrompt(
  config: Pick<ScarceAllocationConfig, "variant" | "availableQuantity" | "timeFrame" | "customers">,
  decisionStyle: DecisionStyle,
): Promise<PuzzlePrompt> {
  const options: PromptOption[] = [
    { id: "allocate", label: await render("scarce-allocation/option-allocate") },
    { id: "raise-prices", label: await render("scarce-allocation/option-raise-prices") },
  ];
  const question = await render("scarce-allocation/strategy-question");
  return {
    user: joinSections([await framing(config), question, await renderDecisionInstructions(options, decisionStyle)]),
    options,
    question: question.trim(),
  };
}

export async function buildScarceAllocationQuantityPrompt(input: {
  config: Pick<ScarceAllocationConfig, "variant" | "availableQuantity" | "timeFrame" | "customers">;
  customer: ScarceAllocationCustomer;
  allocated: readonly { customerId: string; quantity: number }[];
  remaining: number;
  ranges: readonly Range[];
  decisionStyle: DecisionStyle;
}): Promise<PuzzlePrompt> {
  const options = input.ranges.map((range) => ({
    id: `${range.min}:${range.max}`,
    label: range.min === range.max ? String(range.min) : `${range.min}–${range.max}`,
  }));
  const byId = new Map(input.config.customers.map((customer, index) => [customer.id, { customer, index }]));
  const previous = input.allocated.length
    ? input.allocated.map((entry) => {
      const matched = byId.get(entry.customerId);
      return matched ? `${matched.index + 1}. ${matched.customer.name}: ${entry.quantity}` : `${entry.customerId}: ${entry.quantity}`;
    }).join("\n")
    : await render("scarce-allocation/no-previous-allocations");
  const question = await render("scarce-allocation/quantity-question", {
    customer: input.customer.name,
    orderedQuantity: input.customer.orderedQuantity,
    remaining: input.remaining,
  });
  return {
    user: joinSections([
      await framing(input.config),
      await render("scarce-allocation/allocation-state", { previous, remaining: input.remaining }),
      question,
      await renderDecisionInstructions(options, input.decisionStyle),
    ]),
    options,
    question: question.trim(),
  };
}

export function partitionIntegerRange(min: number, max: number, parts = 5): Range[] {
  const count = Math.min(parts, max - min + 1);
  const size = Math.ceil((max - min + 1) / count);
  const ranges: Range[] = [];
  for (let start = min; start <= max; start += size) ranges.push({ min: start, max: Math.min(max, start + size - 1) });
  return ranges;
}

export function parseRangeChoice(choice: string, ranges: readonly Range[]): Range | undefined {
  return ranges.find((range) => `${range.min}:${range.max}` === choice);
}
