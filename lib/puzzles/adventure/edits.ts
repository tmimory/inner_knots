/**
 * Every change the builder can make to an adventure, as pure functions.
 *
 * The screens hold one `Adventure` in state and replace it wholesale, so each
 * gesture — drag a card, connect an option, rename a branch, delete a node — is
 * one of these. Keeping them here rather than inside the components is what lets
 * the canvas, the inspector and the list all agree on what "delete a node" means,
 * and what makes the awkward part testable: removing a node has to clean up the
 * options that pointed at it, and the start node if that is what it was.
 */
import {
  ADVENTURE_LIMITS,
  type Adventure,
  type AdventureInput,
  type AdventureNode,
  type AdventureOption,
} from "@/lib/domain/adventure";
import { newId } from "@/lib/domain/id";

/** The name a freshly created adventure carries until it is given one. */
export const UNTITLED_ADVENTURE = "Untitled adventure";

/** What a copy is called: the original's name plus this. */
const COPY_SUFFIX = "(copy)";

/**
 * A new option. It is labelled by its position because the store requires a
 * non-empty label; the words are the author's to replace.
 */
export function newAdventureOption(index: number): AdventureOption {
  return { id: newId("opt"), label: `Option ${index + 1}`, nextNodeId: null };
}

/** A new, empty decision node. Its prose is the author's to write, not ours. */
export function newAdventureNode(position: { x: number; y: number }): AdventureNode {
  return { id: newId("node"), position, context: "", decision: "", options: [] };
}

/**
 * A brand-new adventure: one start node and nothing in it yet.
 *
 * `validateAdventure` will call that node optionless, which is exactly the nudge
 * the builder should show — the graph is storable, it is just not runnable.
 */
export function starterAdventure(): AdventureInput {
  const start = newAdventureNode({ x: 0, y: 0 });
  return {
    id: newId("adv"),
    name: UNTITLED_ADVENTURE,
    briefing: "",
    startNodeId: start.id,
    nodes: [start],
  };
}

/** The same graph under a new id, so an experiment can fork rather than overwrite. */
export function copyOfAdventure(adventure: Adventure): AdventureInput {
  return {
    id: newId("adv"),
    name: `${adventure.name} ${COPY_SUFFIX}`.slice(0, ADVENTURE_LIMITS.name),
    briefing: adventure.briefing,
    startNodeId: adventure.startNodeId,
    // Node ids are scoped to their adventure, so a copy can keep them.
    nodes: adventure.nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      options: node.options.map((option) => ({ ...option })),
    })),
  };
}

/** Replaces one node, leaving the rest of the graph alone. */
function mapNode(
  adventure: Adventure,
  nodeId: string,
  change: (node: AdventureNode) => AdventureNode,
): Adventure {
  return {
    ...adventure,
    nodes: adventure.nodes.map((node) => (node.id === nodeId ? change(node) : node)),
  };
}

/** Adds an empty node at a spot on the canvas. */
export function addNode(adventure: Adventure, position: { x: number; y: number }): Adventure {
  return { ...adventure, nodes: [...adventure.nodes, newAdventureNode(position)] };
}

/** Edits a node's own fields. Options are changed through the option helpers. */
export function updateNode(
  adventure: Adventure,
  nodeId: string,
  patch: Partial<Pick<AdventureNode, "context" | "decision" | "position">>,
): Adventure {
  return mapNode(adventure, nodeId, (node) => ({ ...node, ...patch }));
}

/**
 * Removes a node and every reference to it: options that led there now end the
 * adventure, and if it was the start node the first node left takes over.
 */
export function removeNode(adventure: Adventure, nodeId: string): Adventure {
  const nodes = adventure.nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => ({
      ...node,
      options: node.options.map((option) =>
        option.nextNodeId === nodeId ? { ...option, nextNodeId: null } : option,
      ),
    }));

  const [first] = nodes;
  const startNodeId =
    adventure.startNodeId === nodeId ? (first?.id ?? adventure.startNodeId) : adventure.startNodeId;

  return { ...adventure, nodes, startNodeId };
}

/** Moves the laurel: this node is where every walk now begins. */
export function setStartNode(adventure: Adventure, nodeId: string): Adventure {
  return { ...adventure, startNodeId: nodeId };
}

/** Adds an option to a node, up to the limit the domain sets. */
export function addOption(adventure: Adventure, nodeId: string): Adventure {
  return mapNode(adventure, nodeId, (node) =>
    node.options.length >= ADVENTURE_LIMITS.maxOptions
      ? node
      : { ...node, options: [...node.options, newAdventureOption(node.options.length)] },
  );
}

/** Edits one option of one node. */
export function updateOption(
  adventure: Adventure,
  nodeId: string,
  optionId: string,
  patch: Partial<Pick<AdventureOption, "label" | "outcome" | "nextNodeId">>,
): Adventure {
  return mapNode(adventure, nodeId, (node) => ({
    ...node,
    options: node.options.map((option) =>
      option.id === optionId ? { ...option, ...patch } : option,
    ),
  }));
}

/** Points one option at a node, or back at nothing — the only way an edge is written. */
export function setOptionTarget(
  adventure: Adventure,
  nodeId: string,
  optionId: string,
  nextNodeId: string | null,
): Adventure {
  return updateOption(adventure, nodeId, optionId, { nextNodeId });
}

/** Removes one option, and with it the edge it stood for. */
export function removeOption(adventure: Adventure, nodeId: string, optionId: string): Adventure {
  return mapNode(adventure, nodeId, (node) => ({
    ...node,
    options: node.options.filter((option) => option.id !== optionId),
  }));
}

/** Copies canvas coordinates onto the graph, unchanged where nothing moved. */
export function setNodePositions(
  adventure: Adventure,
  positions: ReadonlyMap<string, { x: number; y: number }>,
): Adventure {
  let moved = false;
  const nodes = adventure.nodes.map((node) => {
    const next = positions.get(node.id);
    if (!next || (next.x === node.position.x && next.y === node.position.y)) return node;
    moved = true;
    return { ...node, position: { x: Math.round(next.x), y: Math.round(next.y) } };
  });
  return moved ? { ...adventure, nodes } : adventure;
}
