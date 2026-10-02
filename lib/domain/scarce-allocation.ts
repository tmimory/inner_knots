import { z } from "zod";

import { rosterSchema } from "./roster";

export const SCARCE_ALLOCATION_VARIANTS = ["thought-experiment", "real-operator"] as const;
export type ScarceAllocationVariant = (typeof SCARCE_ALLOCATION_VARIANTS)[number];

export const SCARCE_ALLOCATION_LIMITS = {
  customers: 15,
  plans: 3,
  quantity: 1_000_000,
  name: 120,
  description: 2_000,
  timeFrame: 240,
} as const;

export const scarceAllocationCustomerSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(SCARCE_ALLOCATION_LIMITS.name),
  orderedQuantity: z.number().int().min(1).max(SCARCE_ALLOCATION_LIMITS.quantity),
  description: z.string().trim().min(1).max(SCARCE_ALLOCATION_LIMITS.description),
});
export type ScarceAllocationCustomer = z.infer<typeof scarceAllocationCustomerSchema>;

export const scarceAllocationAmountSchema = z.object({
  customerId: z.string().min(1),
  quantity: z.number().int().min(0),
});
export type ScarceAllocationAmount = z.infer<typeof scarceAllocationAmountSchema>;

export const scarceAllocationPlanSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(SCARCE_ALLOCATION_LIMITS.name),
  allocations: z.array(scarceAllocationAmountSchema).max(SCARCE_ALLOCATION_LIMITS.customers),
});
export type ScarceAllocationPlanOption = z.infer<typeof scarceAllocationPlanSchema>;

export type AllocationConstraints = {
  availableQuantity: number;
  customers: readonly { id: string; orderedQuantity: number }[];
};

/** Validate the complete allocation, without correcting the model's answer. */
export function validateAllocation(allocations: readonly ScarceAllocationAmount[], config: AllocationConstraints): string | null {
  const byId = new Map(config.customers.map((customer) => [customer.id, customer]));
  if (allocations.length !== config.customers.length || new Set(allocations.map((entry) => entry.customerId)).size !== allocations.length) {
    return "Include every customer exactly once in the allocation.";
  }
  for (const entry of allocations) {
    const customer = byId.get(entry.customerId);
    if (!customer) return "The allocation includes an unknown customer.";
    if (!Number.isSafeInteger(entry.quantity) || entry.quantity < 0 || entry.quantity > customer.orderedQuantity) {
      return "Each allocation must be a whole number between zero and the customer's ordered quantity.";
    }
  }
  if (allocations.reduce((sum, entry) => sum + entry.quantity, 0) !== config.availableQuantity) {
    return `Allocations must total exactly ${config.availableQuantity} units.`;
  }
  return null;
}

export const scarceAllocationConfigSchema = z.object({
  puzzle: z.literal("scarce-allocation"),
  variant: z.enum(SCARCE_ALLOCATION_VARIANTS),
  mode: z.enum(["plans", "free"]).default("plans"),
  plans: z.array(scarceAllocationPlanSchema).max(SCARCE_ALLOCATION_LIMITS.plans).default([]),
  availableQuantity: z.number().int().min(0).max(SCARCE_ALLOCATION_LIMITS.quantity),
  timeFrame: z.string().trim().min(1).max(SCARCE_ALLOCATION_LIMITS.timeFrame),
  customers: z.array(scarceAllocationCustomerSchema).min(1).max(SCARCE_ALLOCATION_LIMITS.customers),
  roster: rosterSchema,
});
export type ScarceAllocationConfig = z.infer<typeof scarceAllocationConfigSchema>;

export function validateScarceAllocationConfig(config: ScarceAllocationConfig): string | null {
  if (new Set(config.customers.map((customer) => customer.id)).size !== config.customers.length) {
    return "Each customer must have a unique id.";
  }
  const demand = config.customers.reduce((total, customer) => total + customer.orderedQuantity, 0);
  if (demand <= config.availableQuantity) return "Outstanding orders must exceed the available quantity.";
  if (config.mode === "plans") {
    if (!config.plans.length) return "Add at least one allocation plan.";
    if (config.plans.length > SCARCE_ALLOCATION_LIMITS.plans) return "Use at most three allocation plans.";
    if (new Set(config.plans.map((plan) => plan.id)).size !== config.plans.length) return "Each plan must have a unique id.";
    for (const plan of config.plans) {
      if (!plan.name.trim()) return "Give every allocation plan a name.";
      const error = validateAllocation(plan.allocations, config);
      if (error) return `${plan.name}: ${error}`;
    }
  }
  return null;
}

export const SCARCE_ALLOCATION_STRATEGIES = ["allocate", "raise-prices"] as const;
export type ScarceAllocationStrategy = (typeof SCARCE_ALLOCATION_STRATEGIES)[number];

export const scarceAllocationDecisionSummarySchema = z.object({
  characterId: z.string(),
  iteration: z.number().int().min(1),
  strategy: z.enum(SCARCE_ALLOCATION_STRATEGIES).optional(),
  selectedPlanId: z.string().optional(),
  selectedPlanName: z.string().optional(),
  allocations: z.array(scarceAllocationAmountSchema),
  allocatedQuantity: z.number().int().min(0),
  unallocatedQuantity: z.number().int().min(0),
  /** True only after the allocation workflow reaches a terminal successful outcome. */
  complete: z.boolean().default(false),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
});
export type ScarceAllocationDecisionSummary = z.infer<typeof scarceAllocationDecisionSummarySchema>;

export const scarceAllocationSummarySchema = z.object({
  kind: z.literal("scarce-allocation"),
  decisions: z.array(scarceAllocationDecisionSummarySchema),
});
export type ScarceAllocationSummary = z.infer<typeof scarceAllocationSummarySchema>;
