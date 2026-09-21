/**
 * Adventure: a branching scenario the characters walk through one node at a time.
 *
 * Edges are implicit: every option carries the id of the node it leads to, or
 * `null` when choosing it ends the adventure. React Flow positions live on the
 * node so the builder can round-trip a graph without a separate layout store.
 */
import { z } from "zod";

export const ADVENTURE_LIMITS = {
  name: 120,
  briefing: 1000,
  context: 1000,
  decision: 500,
  optionLabel: 100,
  outcome: 500,
  maxOptions: 5,
} as const;

export const adventureOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(ADVENTURE_LIMITS.optionLabel),
  /** Narration shown after the option is taken, before the next node. */
  outcome: z.string().max(ADVENTURE_LIMITS.outcome).optional(),
  /** `null` ends the adventure on this branch. */
  nextNodeId: z.string().min(1).nullable(),
});
export type AdventureOption = z.infer<typeof adventureOptionSchema>;

export const adventureNodeSchema = z.object({
  id: z.string().min(1),
  /** React Flow canvas position. */
  position: z.object({ x: z.number(), y: z.number() }),
  context: z.string().max(ADVENTURE_LIMITS.context),
  decision: z.string().max(ADVENTURE_LIMITS.decision),
  options: z.array(adventureOptionSchema).max(ADVENTURE_LIMITS.maxOptions),
});
export type AdventureNode = z.infer<typeof adventureNodeSchema>;

export const adventureSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(ADVENTURE_LIMITS.name),
  briefing: z.string().max(ADVENTURE_LIMITS.briefing),
  startNodeId: z.string().min(1),
  nodes: z.array(adventureNodeSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Adventure = z.infer<typeof adventureSchema>;

export const adventureInputSchema = adventureSchema.partial({ createdAt: true, updatedAt: true });
export type AdventureInput = z.infer<typeof adventureInputSchema>;

/** A structural problem found by {@link validateAdventure}. */
export type AdventureIssue = {
  code: "missing-start" | "unreachable-node" | "dangling-option" | "node-without-options" | "duplicate-node-id";
  message: string;
  nodeId?: string;
  optionId?: string;
};

/**
 * Structural check for the builder and for the run route. A graph with issues is
 * still storable (users build them incrementally); a run refuses to start on one.
 */
export function validateAdventure(adventure: Pick<Adventure, "startNodeId" | "nodes">): AdventureIssue[] {
  const issues: AdventureIssue[] = [];
  const byId = new Map<string, AdventureNode>();

  for (const node of adventure.nodes) {
    if (byId.has(node.id)) {
      issues.push({ code: "duplicate-node-id", message: `Two nodes share the id "${node.id}".`, nodeId: node.id });
      continue;
    }
    byId.set(node.id, node);
  }

  if (!byId.has(adventure.startNodeId)) {
    issues.push({
      code: "missing-start",
      message: `The start node "${adventure.startNodeId}" is not in the graph.`,
      nodeId: adventure.startNodeId,
    });
  }

  for (const node of byId.values()) {
    if (node.options.length === 0) {
      issues.push({ code: "node-without-options", message: `Node "${node.id}" has no options.`, nodeId: node.id });
    }
    for (const option of node.options) {
      if (option.nextNodeId !== null && !byId.has(option.nextNodeId)) {
        issues.push({
          code: "dangling-option",
          message: `Option "${option.label}" on node "${node.id}" points at missing node "${option.nextNodeId}".`,
          nodeId: node.id,
          optionId: option.id,
        });
      }
    }
  }

  const reachable = new Set<string>();
  const queue: string[] = byId.has(adventure.startNodeId) ? [adventure.startNodeId] : [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || reachable.has(current)) continue;
    reachable.add(current);
    const node = byId.get(current);
    if (!node) continue;
    for (const option of node.options) {
      if (option.nextNodeId !== null && !reachable.has(option.nextNodeId)) queue.push(option.nextNodeId);
    }
  }

  for (const node of byId.values()) {
    if (!reachable.has(node.id)) {
      issues.push({
        code: "unreachable-node",
        message: `Node "${node.id}" cannot be reached from the start node.`,
        nodeId: node.id,
      });
    }
  }

  return issues;
}
