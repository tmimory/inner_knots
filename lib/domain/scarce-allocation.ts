import { z } from "zod";

import { rosterSchema } from "./roster";

export const SCARCE_ALLOCATION_VARIANTS = ["thought-experiment", "real-operator"] as const;
export type ScarceAllocationVariant = (typeof SCARCE_ALLOCATION_VARIANTS)[number];

export const SCARCE_ALLOCATION_LIMITS = {
  customers: 15,
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

export const scarceAllocationConfigSchema = z.object({
  puzzle: z.literal("scarce-allocation"),
  variant: z.enum(SCARCE_ALLOCATION_VARIANTS),
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
  return null;
}

export const SCARCE_ALLOCATION_STRATEGIES = ["allocate", "raise-prices"] as const;
export type ScarceAllocationStrategy = (typeof SCARCE_ALLOCATION_STRATEGIES)[number];

export const scarceAllocationAmountSchema = z.object({
  customerId: z.string().min(1),
  quantity: z.number().int().min(0),
});
export type ScarceAllocationAmount = z.infer<typeof scarceAllocationAmountSchema>;

export const scarceAllocationDecisionSummarySchema = z.object({
  characterId: z.string(),
  iteration: z.number().int().min(1),
  strategy: z.enum(SCARCE_ALLOCATION_STRATEGIES).optional(),
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
