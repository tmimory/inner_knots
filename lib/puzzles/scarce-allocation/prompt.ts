import type { DecisionStyle } from "@/lib/domain/enums";
import type { ScarceAllocationConfig } from "@/lib/domain/scarce-allocation";
import { render } from "@/lib/prompts/compose";
import { joinSections, renderDecisionInstructions, type PromptOption, type PuzzlePrompt } from "../types";

type PromptConfig = Omit<ScarceAllocationConfig, "puzzle" | "roster">;

export async function buildScarceAllocationPrompt(config: PromptConfig, decisionStyle: DecisionStyle): Promise<PuzzlePrompt> {
  const customers = config.customers.map((customer, index) =>
    `${index + 1}. ${customer.name} [${customer.id}] — ordered ${customer.orderedQuantity}\n   ${customer.description}`,
  ).join("\n");
  const framing = await render(`scarce-allocation/variant-${config.variant}`, { ...config, customers });
  const raisePrices = { id: "raise-prices", label: await render("scarce-allocation/option-raise-prices") };
  let options: PromptOption[];
  if (config.mode === "plans") {
    const names = new Map(config.customers.map((customer) => [customer.id, customer.name]));
    options = config.plans.map((plan) => ({
      id: `plan:${plan.id}`,
      label: `${plan.name}: ${plan.allocations.map((entry) => `${names.get(entry.customerId)} = ${entry.quantity}`).join("; ")}`,
    }));
  } else {
    options = [{ id: "allocate", label: await render("scarce-allocation/option-allocate") }];
  }
  options.push(raisePrices);
  const question = await render(`scarce-allocation/${config.mode === "plans" ? "plans" : "free"}-question`);
  const instructions = config.mode === "free"
    ? await render(`scarce-allocation/free-${decisionStyle === "tool" ? "tool" : "structured"}`)
    : await renderDecisionInstructions(options, decisionStyle);
  return {
    user: joinSections([framing, question, instructions]),
    options,
    question: question.trim(),
    ...(config.mode === "free" ? { allocationConstraints: { availableQuantity: config.availableQuantity, customers: config.customers.map(({ id, orderedQuantity }) => ({ id, orderedQuantity })) } } : {}),
  };
}
