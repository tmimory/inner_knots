/**
 * The avatar roster: fifteen marginal figures, in the order the picker shows them.
 *
 * Each entry's `Component` takes `{ color, size }` and tints exactly one region of
 * an otherwise ink-and-parchment drawing.
 */
import { Amphora } from "./shapes/amphora";
import { Automaton } from "./shapes/automaton";
import { Cat } from "./shapes/cat";
import { Chicken } from "./shapes/chicken";
import { Column } from "./shapes/column";
import { Goat } from "./shapes/goat";
import { Hare } from "./shapes/hare";
import type { AvatarShapeComponent } from "./shapes/ink";
import { Moth } from "./shapes/moth";
import { Octopus } from "./shapes/octopus";
import { Oracle } from "./shapes/oracle";
import { Owl } from "./shapes/owl";
import { Philosopher } from "./shapes/philosopher";
import { Ship } from "./shapes/ship";
import { Sphinx } from "./shapes/sphinx";
import { Tortoise } from "./shapes/tortoise";

export type AvatarShapeEntry = {
  /** Stable id stored on a Character. */
  id: string;
  /** Human label for the picker and the accessible name. */
  label: string;
  Component: AvatarShapeComponent;
};

export const AVATAR_SHAPES = [
  { id: "philosopher", label: "Philosopher", Component: Philosopher },
  { id: "owl", label: "Owl", Component: Owl },
  { id: "chicken", label: "Chicken", Component: Chicken },
  { id: "tortoise", label: "Tortoise", Component: Tortoise },
  { id: "hare", label: "Hare", Component: Hare },
  { id: "cat", label: "Cat", Component: Cat },
  { id: "ship", label: "Ship", Component: Ship },
  { id: "amphora", label: "Amphora", Component: Amphora },
  { id: "column", label: "Column", Component: Column },
  { id: "sphinx", label: "Sphinx", Component: Sphinx },
  { id: "oracle", label: "Oracle", Component: Oracle },
  { id: "goat", label: "Goat", Component: Goat },
  { id: "octopus", label: "Octopus", Component: Octopus },
  { id: "automaton", label: "Automaton", Component: Automaton },
  { id: "moth", label: "Moth", Component: Moth },
] as const satisfies readonly AvatarShapeEntry[];

export type AvatarShapeId = (typeof AVATAR_SHAPES)[number]["id"];

/** The shape a character gets before anyone chooses one. */
export const DEFAULT_AVATAR_SHAPE: AvatarShapeId = AVATAR_SHAPES[0].id;

const byId = new Map<string, AvatarShapeEntry>(AVATAR_SHAPES.map((entry) => [entry.id, entry]));

/** The entry for `id`, falling back to the first shape when the id is unknown. */
export function avatarShape(id: string): AvatarShapeEntry {
  return byId.get(id) ?? AVATAR_SHAPES[0];
}
