import type { ScarceAllocationConfig, ScarceAllocationDecisionSummary } from "@/lib/domain/scarce-allocation";

/** Shared wording for live results and the saved ledger. */
export function allocationStatus(decision: ScarceAllocationDecisionSummary): string {
  if (decision.error) return decision.error;
  if (decision.strategy === "raise-prices") {
    return "Raise prices until cancellations reduce outstanding orders below capacity.";
  }
  const quantities = `${decision.allocatedQuantity} allocated · ${decision.unallocatedQuantity} unallocated`;
  return decision.complete ? quantities : `Partial allocation · ${quantities}`;
}

export function allocationRows(
  decision: ScarceAllocationDecisionSummary,
  config?: Pick<ScarceAllocationConfig, "customers">,
): { id: string; name: string; quantity: number }[] {
  const customers = new Map(config?.customers.map((customer) => [customer.id, customer.name]));
  return decision.allocations.map((allocation) => ({
    id: allocation.customerId,
    name: customers.get(allocation.customerId) ?? allocation.customerId,
    quantity: allocation.quantity,
  }));
}
