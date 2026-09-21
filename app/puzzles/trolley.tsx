import { useCallback, useMemo, useState } from "react";

import { Screen } from "@/components/shell";
import { PromptView } from "@/components/puzzles/prompt-view";
import { RosterBar } from "@/components/puzzles/roster-bar";
import { RunProgress } from "@/components/puzzles/run-progress";
import { Section } from "@/components/puzzles/section";
import {
  ObjectCreator,
  ObjectPalette,
  TrackBoard,
  TrolleyAnimation,
  TRACK_ZONE_IDS,
  TrolleyResults,
  trackOf,
  useDropZones,
  type DragPoint,
  type TrackId,
  type TrackZoneId,
} from "@/components/puzzles/trolley";
import { VariantSelect, type VariantOption } from "@/components/puzzles/variant-select";
import { Badge, Button, Text } from "@/components/ui";
import { previewTrolleyPrompt } from "@/lib/client/prompts";
import { useCatalogue } from "@/lib/client/use-catalogue";
import { useCharacters } from "@/lib/client/use-characters";
import { usePersistedState } from "@/lib/client/use-persisted-state";
import { usePromptPreview } from "@/lib/client/use-prompt-preview";
import { useRun, useRunStarter } from "@/lib/client/use-run";
import { pluralize } from "@/lib/format";
import { RUN_LIMITS, TROLLEY_VARIANTS, type RosterEntry, type TrolleyVariant } from "@/lib/domain/run";
import type { TrolleySummary } from "@/lib/domain/summary";
import type { TrolleyObject } from "@/lib/puzzles/trolley/catalogue";
import { randomSelection } from "@/lib/puzzles/trolley/catalogue";
import { randomTracks } from "@/lib/puzzles/trolley/search";

/**
 * How the three framings are described in the interface.
 *
 * This is UI copy: what the model actually reads lives in
 * `prompts/trolley/variant-*.md` and is never duplicated here.
 */
const VARIANTS: readonly VariantOption<TrolleyVariant>[] = [
  {
    id: "thought-experiment",
    label: "Thought experiment",
    description: "The classic framing: a philosopher's puzzle, stated as one.",
  },
  {
    id: "employee",
    label: "Trolley company employee",
    description: "You work here. This is a Tuesday, and the lever is your job.",
  },
  {
    id: "bystander",
    label: "Bystander",
    description: "You happened to be standing by the lever when it happened.",
  },
];

/** How many objects a track holds, and how many a randomized draw puts on each. */
const TRACK_CAPACITY = 5;

type Board = {
  variant: TrolleyVariant;
  track1: string[];
  track2: string[];
  roster: RosterEntry[];
};

const EMPTY_BOARD: Board = {
  variant: "thought-experiment",
  track1: [],
  track2: [],
  roster: [],
};

/** Reads back a board stored by an older build without trusting any of it. */
function parseBoard(raw: unknown): Board | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const value = raw as Partial<Record<keyof Board, unknown>>;

  const variant = TROLLEY_VARIANTS.find((entry) => entry === value.variant);
  const ids = (input: unknown): string[] =>
    Array.isArray(input) ? input.filter((id): id is string => typeof id === "string") : [];
  const roster = Array.isArray(value.roster)
    ? value.roster.flatMap((entry): RosterEntry[] => {
        if (typeof entry !== "object" || entry === null) return [];
        const { characterId, runs } = entry as { characterId?: unknown; runs?: unknown };
        if (typeof characterId !== "string" || typeof runs !== "number") return [];
        return [{ characterId, runs: Math.max(RUN_LIMITS.minRuns, Math.round(runs)) }];
      })
    : [];

  return {
    variant: variant ?? EMPTY_BOARD.variant,
    track1: ids(value.track1),
    track2: ids(value.track2),
    roster: roster.slice(0, RUN_LIMITS.maxRoster),
  };
}

export default function TrolleyScreen() {
  const { characters } = useCharacters();
  const catalogue = useCatalogue();
  const zones = useDropZones<TrackZoneId>(TRACK_ZONE_IDS);

  const [board, setBoard] = usePersistedState<Board>("puzzles.trolley", EMPTY_BOARD, parseBoard);
  const [hovered, setHovered] = useState<TrackId | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);

  const prompt = usePromptPreview(async () => {
    const { prompt: composed } = await previewTrolleyPrompt({
      variant: board.variant,
      track1: board.track1,
      track2: board.track2,
    });
    return [{ system: composed.system, user: composed.user, options: composed.options }];
  });

  const starter = useRunStarter();
  const { run, summary } = useRun(starter.runId);
  const trolleySummary: TrolleySummary | undefined =
    summary?.kind === "trolley" ? summary : undefined;

  const characterIndex = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters],
  );

  /** Track contents resolved to objects; an id the catalogue lost simply drops out. */
  const resolve = useCallback(
    (ids: readonly string[]): TrolleyObject[] =>
      ids.flatMap((id) => {
        const item = catalogue.byId.get(id);
        return item ? [item] : [];
      }),
    [catalogue.byId],
  );

  const track1 = useMemo(() => resolve(board.track1), [board.track1, resolve]);
  const track2 = useMemo(() => resolve(board.track2), [board.track2, resolve]);

  const patch = useCallback(
    (changes: Partial<Board>) => setBoard({ ...board, ...changes }),
    [board, setBoard],
  );

  const capacityLeft = useCallback(
    (track: TrackId) => (track === 1 ? board.track1 : board.track2).length < TRACK_CAPACITY,
    [board.track1, board.track2],
  );

  const place = useCallback(
    (item: TrolleyObject, track: TrackId) => {
      const key = track === 1 ? "track1" : "track2";
      const current = board[key];
      if (current.length >= TRACK_CAPACITY) return;
      patch({ [key]: [...current, item.id] } as Partial<Board>);
    },
    [board, patch],
  );

  const removeAt = useCallback(
    (track: TrackId, index: number) => {
      const key = track === 1 ? "track1" : "track2";
      patch({ [key]: board[key].filter((_, at) => at !== index) } as Partial<Board>);
    },
    [board, patch],
  );

  const dragMove = useCallback(
    (point: DragPoint) => {
      const zone = zones.hitTest(point.x, point.y);
      setHovered(zone === null ? null : trackOf(zone));
    },
    [zones],
  );

  const dropItem = useCallback(
    (item: TrolleyObject, point: DragPoint) => {
      setHovered(null);
      const zone = zones.hitTest(point.x, point.y);
      if (zone !== null) place(item, trackOf(zone));
    },
    [place, zones],
  );

  const randomize = useCallback(() => {
    const drawn = randomTracks(catalogue.items, TRACK_CAPACITY, (pool, n) =>
      randomSelection(pool, n),
    );
    patch({
      track1: drawn.track1.map((item) => item.id),
      track2: drawn.track2.map((item) => item.id),
    });
  }, [catalogue.items, patch]);

  const clearTracks = useCallback(() => patch({ track1: [], track2: [] }), [patch]);

  const blocked =
    board.roster.length === 0
      ? "Put at least one character on the roster."
      : board.track1.length === 0 && board.track2.length === 0
        ? "Put something on at least one track."
        : null;

  async function startRun() {
    if (blocked !== null) return;
    await starter.start({
      puzzle: "trolley",
      variant: board.variant,
      track1: board.track1,
      track2: board.track2,
      roster: board.roster,
    });
  }

  const total = board.roster.reduce((sum, entry) => sum + entry.runs, 0);

  return (
    <Screen
      title="Trolley Problems"
      subtitle="ἁμαξοστοιχία · the lever and the lesser evil"
      right={
        <Badge variant="outline">
          <Text>{`${catalogue.items.length} objects`}</Text>
        </Badge>
      }
    >
      <Text variant="lead">
        Load the tracks, choose how to ask, and watch the roster decide who or what the
        trolley meets.
      </Text>

      <Section
        title="The roster"
        description="Who answers, and how many times each. Up to five characters."
      >
        <RosterBar
          value={board.roster}
          onChange={(roster) => patch({ roster })}
          characters={characters}
          max={RUN_LIMITS.maxRoster}
          min={0}
          showRuns
        />
      </Section>

      <Section
        title="The framing"
        description="The same tracks, asked three different ways."
        right={
          <Button variant="outline" size="sm" onPress={() => void prompt.show()}>
            <Text>Prompt View</Text>
          </Button>
        }
      >
        <VariantSelect
          value={board.variant}
          onChange={(variant) => patch({ variant })}
          options={VARIANTS}
        />
      </Section>

      <Section
        title="The tracks"
        description={`Drag from the palette, or tap a tile and pick a track. ${TRACK_CAPACITY} per track.`}
      >
        <TrackBoard
          track1={track1}
          track2={track2}
          onRemove={removeAt}
          zones={zones}
          hovered={hovered}
          max={TRACK_CAPACITY}
          overlay={(width) => (
            <TrolleyAnimation
              // A new run remounts the animation, rewinding its decision queue.
              key={starter.runId ?? "idle"}
              decisions={trolleySummary?.decisions ?? []}
              characters={characterIndex}
              width={width}
            />
          )}
        />
        <ObjectPalette
          items={catalogue.items}
          loading={catalogue.loading}
          canPlace={capacityLeft}
          onPlace={place}
          onDropItem={dropItem}
          onDragStart={zones.remeasure}
          onDragMove={dragMove}
          onRandomize={randomize}
          onClear={clearTracks}
          onCreate={() => setCreatorOpen(true)}
        />
        {catalogue.error ? <Text className="text-destructive">{catalogue.error}</Text> : null}
      </Section>

      <Section
        title="The run"
        description={
          blocked ??
          `${pluralize(total, "decision")} across ${pluralize(board.roster.length, "character")}.`
        }
        right={
          <Button disabled={blocked !== null || starter.starting} onPress={() => void startRun()}>
            <Text>{starter.starting ? "Starting…" : "Pull the lever"}</Text>
          </Button>
        }
      >
        <RunProgress run={run ?? null} idleMessage="No run started yet." />
        {starter.error ? (
          <Text className="text-destructive">{starter.error.message}</Text>
        ) : null}
      </Section>

      <Section title="What they chose" description="Counts per character, per track.">
        <TrolleyResults
          summary={trolleySummary}
          roster={board.roster}
          characters={characterIndex}
          runId={starter.runId}
        />
      </Section>

      <ObjectCreator
        open={creatorOpen}
        onOpenChange={setCreatorOpen}
        custom={catalogue.custom}
        taken={catalogue.has}
        create={catalogue.create}
        remove={catalogue.remove}
      />

      <PromptView
        open={prompt.open}
        onOpenChange={prompt.setOpen}
        title="Trolley prompt"
        description="The puzzle's own words. A character's steering prompt is prepended by the engine and is not shown here."
        panels={prompt.panels}
        loading={prompt.loading}
        error={prompt.error}
      />
    </Screen>
  );
}
