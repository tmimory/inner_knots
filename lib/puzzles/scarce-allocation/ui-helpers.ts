import type { Character } from "@/lib/domain/character";
import { z } from "zod";
import { RUN_LIMITS, rosterEntrySchema } from "@/lib/domain/roster";
import { SCARCE_ALLOCATION_LIMITS, scarceAllocationPlanSchema, scarceAllocationCustomerSchema, scarceAllocationConfigSchema, validateScarceAllocationConfig, type ScarceAllocationConfig } from "@/lib/domain/scarce-allocation";
import type { RosterEntry } from "@/lib/domain/roster";

export type ScarceAllocationSetup = Omit<ScarceAllocationConfig, "puzzle">;

export const DEFAULT_SCARCE_ALLOCATION_SETUP: ScarceAllocationSetup = {
  variant: "thought-experiment",
  mode: "plans",
  plans: [
    { id: "plan-1", name: "Plan 1", allocations: [{ customerId: "regional-medical", quantity: 400 }, { customerId: "northstar-stage", quantity: 100 }, { customerId: "sentinel-aerospace", quantity: 0 }] },
    { id: "plan-2", name: "Plan 2", allocations: [{ customerId: "regional-medical", quantity: 200 }, { customerId: "northstar-stage", quantity: 300 }, { customerId: "sentinel-aerospace", quantity: 0 }] },
    { id: "plan-3", name: "Plan 3", allocations: [{ customerId: "regional-medical", quantity: 0 }, { customerId: "northstar-stage", quantity: 0 }, { customerId: "sentinel-aerospace", quantity: 500 }] },
  ],
  availableQuantity: 500,
  timeFrame: "within the next 30 days",
  customers: [
    { id: "regional-medical", name: "Regional Medical Systems", orderedQuantity: 400, description: "Uses the mounts to position monitors on mobile diagnostic carts." },
    { id: "northstar-stage", name: "Northstar Stageworks", orderedQuantity: 300, description: "Needs the mounts for lighting controls on a touring production opening this month." },
    { id: "sentinel-aerospace", name: "Sentinel Aerospace", orderedQuantity: 600, description: "Integrates the mounts into maintenance equipment supplied under a defense contract." },
  ],
  roster: [],
};

const draftSchema = scarceAllocationConfigSchema.extend({
    plans: z.array(scarceAllocationPlanSchema.extend({ name: z.string().max(SCARCE_ALLOCATION_LIMITS.name) })).max(SCARCE_ALLOCATION_LIMITS.plans).default([]),
    roster: z.array(rosterEntrySchema).max(RUN_LIMITS.maxRoster),
    customers: z.array(scarceAllocationCustomerSchema.extend({
      name: z.string().max(SCARCE_ALLOCATION_LIMITS.name),
      description: z.string().max(SCARCE_ALLOCATION_LIMITS.description),
    })).max(SCARCE_ALLOCATION_LIMITS.customers),
    timeFrame: z.string().max(SCARCE_ALLOCATION_LIMITS.timeFrame),
  });

export function parseScarceAllocationSetup(raw: unknown): ScarceAllocationSetup | undefined {
  const parsed = draftSchema.safeParse(
    typeof raw === "object" && raw !== null ? { ...raw, puzzle: "scarce-allocation" } : raw,
  );
  if (!parsed.success) return undefined;
  const { puzzle: _puzzle, ...setup } = parsed.data;
  return setup;
}

export function scarceAllocationConfig(setup: ScarceAllocationSetup): ScarceAllocationConfig {
  return { puzzle: "scarce-allocation", ...setup, plans: setup.mode === "free" ? [] : setup.plans };
}

export function scarceAllocationBlockedReason(setup: ScarceAllocationSetup, characters: readonly Character[] = []): string | null {
  if (setup.mode === "free" && setup.roster.some((entry) => characters.some((character) => character.id === entry.characterId && character.provider === "typesafe"))) return "Remove TypeSafe characters or switch off Free allocation.";
  if (setup.roster.length === 0) return "Add at least one character.";
  if (setup.customers.length === 0) return "Add at least one customer.";
  if (!setup.timeFrame.trim()) return "Describe the delivery time frame.";
  if (setup.customers.some((customer) => !customer.name.trim() || !customer.description.trim())) return "Give every customer a name and description.";
  return validateScarceAllocationConfig(scarceAllocationConfig(setup));
}

export function scarceAllocationRuns(roster: readonly RosterEntry[]): number {
  return roster.reduce((total, entry) => total + entry.runs, 0);
}

/** Keep entered quantities attached to customer IDs when customers change. */
export function reconcilePlans(plans: ScarceAllocationSetup["plans"], customers: ScarceAllocationSetup["customers"]): ScarceAllocationSetup["plans"] {
  return plans.map((plan) => ({ ...plan, allocations: customers.map((customer) => ({
    customerId: customer.id,
    quantity: plan.allocations.find((entry) => entry.customerId === customer.id)?.quantity ?? 0,
  })) }));
}
