/**
 * Everything a run needs resolved before the first model call.
 *
 * `prepareRun` is deliberately called twice: once by `POST /api/runs`, so a
 * config naming a character that does not exist is a 400 the user sees
 * immediately, and once by the engine when it starts executing, because the
 * store may have changed between the two. The route and the engine therefore
 * agree by construction on what a run is made of and on how many decisions it
 * will take.
 *
 * Server only: it reads the JSONL store.
 */
import { validateAdventure, type Adventure, type AdventureIssue } from "@/lib/domain/adventure";
import type { Character } from "@/lib/domain/character";
import type { RosterEntry, RunConfig } from "@/lib/domain/run";
import { buildCatalogue } from "@/lib/puzzles/trolley/catalogue";
import type { TrackItem } from "@/lib/puzzles/trolley/prompt";
import { adventures, characters as charactersStore, trolleyObjects } from "@/lib/storage/collections";
import { indexById } from "@/lib/utils";

/** A run that cannot start. The API route turns it into a 400. */
export class RunSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RunSetupError";
  }
}

/** An unreachable node is a builder warning; it cannot stop a walk that never gets there. */
const NON_BLOCKING_ISSUES: readonly AdventureIssue["code"][] = ["unreachable-node"];

/** One roster entry with its character resolved. */
export type RosterMember = { character: Character; runs: number };

export type TrolleyPlan = {
  puzzle: "trolley";
  config: Extract<RunConfig, { puzzle: "trolley" }>;
  total: number;
  roster: RosterMember[];
  track1: TrackItem[];
  track2: TrackItem[];
};

export type PrisonersDilemmaPlan = {
  puzzle: "prisoners-dilemma";
  config: Extract<RunConfig, { puzzle: "prisoners-dilemma" }>;
  total: number;
  playerA: Character;
  playerB: Character;
};

export type AdventurePlan = {
  puzzle: "adventure";
  config: Extract<RunConfig, { puzzle: "adventure" }>;
  total: number;
  roster: RosterMember[];
  adventure: Adventure;
};

export type RunPlan = TrolleyPlan | PrisonersDilemmaPlan | AdventurePlan;

function quote(ids: readonly string[]): string {
  return ids.map((id) => `"${id}"`).join(", ");
}

/** Reads a resolved entry back out of the map, which `resolveCharacters` filled. */
function required<T>(byId: Map<string, T>, id: string): T {
  const value = byId.get(id);
  if (value === undefined) throw new RunSetupError(`Unknown character id "${id}".`);
  return value;
}

/**
 * The roster of a puzzle that has one, with each entry's character resolved and
 * the run's `total` decided: a roster run is Σ of its per-character run counts.
 */
async function resolveRoster(
  entries: readonly RosterEntry[],
): Promise<{ roster: RosterMember[]; total: number }> {
  const byId = await resolveCharacters(entries.map((entry) => entry.characterId));
  const roster = entries.map((entry) => ({
    character: required(byId, entry.characterId),
    runs: entry.runs,
  }));
  return { roster, total: roster.reduce((sum, entry) => sum + entry.runs, 0) };
}

/** Characters by id, or a `RunSetupError` naming every id that is not in the store. */
async function resolveCharacters(ids: readonly string[]): Promise<Map<string, Character>> {
  const byId = indexById(await charactersStore.list());
  const missing = [...new Set(ids)].filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new RunSetupError(`Unknown character ids: ${quote(missing)}.`);
  }
  return byId;
}

/**
 * Trolley objects by id. A user's own objects win over the built-in catalogue, so
 * editing a built-in by re-saving it under the same id changes what a run sends.
 */
export async function resolveTrolleyObjects(
  ids: readonly string[],
): Promise<TrackItem[]> {
  const byId = new Map<string, TrackItem>();
  for (const object of buildCatalogue()) byId.set(object.id, object);
  for (const object of await trolleyObjects.list()) byId.set(object.id, object);

  const items: TrackItem[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const object = byId.get(id);
    if (object) items.push(object);
    else missing.push(id);
  }
  if (missing.length > 0) {
    throw new RunSetupError(`Unknown object ids: ${quote([...new Set(missing)])}.`);
  }
  return items;
}

/** Resolves a config into everything the runner needs, or throws `RunSetupError`. */
export async function prepareRun(config: RunConfig): Promise<RunPlan> {
  switch (config.puzzle) {
    case "trolley": {
      const { roster, total } = await resolveRoster(config.roster);
      const [track1, track2] = await Promise.all([
        resolveTrolleyObjects(config.track1),
        resolveTrolleyObjects(config.track2),
      ]);
      if (track1.length === 0 && track2.length === 0) {
        throw new RunSetupError("Put something on at least one track before running.");
      }
      return { puzzle: "trolley", config, total, roster, track1, track2 };
    }

    case "prisoners-dilemma": {
      const byId = await resolveCharacters([config.playerA, config.playerB]);
      return {
        puzzle: "prisoners-dilemma",
        config,
        total: config.runs * config.iterations * 2,
        playerA: required(byId, config.playerA),
        playerB: required(byId, config.playerB),
      };
    }

    case "adventure": {
      // A walk is the unit of progress here, however many nodes it turns out to visit.
      const { roster, total } = await resolveRoster(config.roster);
      const adventure = await adventures.get(config.adventureId);
      if (!adventure) {
        throw new RunSetupError(`No adventure with id "${config.adventureId}".`);
      }
      const blocking = validateAdventure(adventure).filter(
        (issue) => !NON_BLOCKING_ISSUES.includes(issue.code),
      );
      if (blocking.length > 0) {
        throw new RunSetupError(
          `The adventure cannot be run yet: ${blocking.map((issue) => issue.message).join(" ")}`,
        );
      }
      return { puzzle: "adventure", config, total, roster, adventure };
    }
  }
}
