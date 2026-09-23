import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";

import { Screen } from "@/components/shell";
import { PromptView } from "@/components/puzzles/prompt-view";
import { RosterBar } from "@/components/puzzles/roster-bar";
import { RunFooter } from "@/components/puzzles/run-footer";
import { Section } from "@/components/puzzles/section";
import { Subsection } from "@/components/puzzles/subsection";
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
import { Button, Text } from "@/components/ui";
import { previewTrolleyPrompt } from "@/lib/client/prompts";
import { useCatalogue } from "@/lib/client/use-catalogue";
import { useCharacters } from "@/lib/client/use-characters";
import { usePersistedState } from "@/lib/client/use-persisted-state";
import { seatedCharacters, usePromptPreview } from "@/lib/client/use-prompt-preview";
import { useRun, useRunStarter } from "@/lib/client/use-run";
import { pluralize } from "@/lib/format";
import { RUN_LIMITS, TROLLEY_VARIANTS, type RosterEntry, type TrolleyVariant } from "@/lib/domain/run";
import type { TrolleySummary } from "@/lib/domain/summary";
import type { TrolleyObject } from "@/lib/puzzles/trolley/catalogue";
import { randomSelection } from "@/lib/puzzles/trolley/catalogue";
import { parseRoster } from "@/lib/puzzles/setup-parse";
import { indexById } from "@/lib/utils";
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

  return {
    variant: variant ?? EMPTY_BOARD.variant,
    track1: ids(value.track1),
    track2: ids(value.track2),
    roster: parseRoster(value.roster, { max: RUN_LIMITS.maxRoster, runs: "stored" }),
  };
}

export default function TrolleyScreen() {
  const { characters } = useCharacters();
  const catalogue = useCatalogue();
  const zones = useDropZones<TrackZoneId>(TRACK_ZONE_IDS);

  const [board, setBoard] = usePersistedState<Board>("puzzles.trolley", EMPTY_BOARD, parseBoard);
  const [hovered, setHovered] = useState<TrackId | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  /** A tile is in the air, or one has been tapped: the board shows its places. */
  const [dragging, setDragging] = useState(false);
  const [armed, setArmed] = useState(false);

  const characterIndex = useMemo(() => indexById(characters), [characters]);

  /** The roster's characters, in seat order: the faces the preview may be read as. */
  const seated = useMemo(
    () => seatedCharacters(board.roster, characterIndex),
    [board.roster, characterIndex],
  );

  /**
   * The prompt as one of the seated characters will read it. The closing
   * paragraph belongs to whoever answers — a TypeSafe character is never shown a
   * response format — so the style travels with the selected viewpoint, and an
   * empty roster falls back to the route's default.
   */
  const prompt = usePromptPreview(
    async (viewpoint) => {
      const { prompt: composed } = await previewTrolleyPrompt({
        variant: board.variant,
        track1: board.track1,
        track2: board.track2,
        decisionStyle: viewpoint?.decisionStyle,
      });
      return [{ system: composed.system, user: composed.user, options: composed.options }];
    },
    { characters: seated },
  );

  const starter = useRunStarter();
  const { run, summary } = useRun(starter.runId);
  const trolleySummary: TrolleySummary | undefined =
    summary?.kind === "trolley" ? summary : undefined;

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
    (track: TrackId) => (track === 1 ? board.track1 : board.track2).length < RUN_LIMITS.maxTrack,
    [board.track1, board.track2],
  );

  const place = useCallback(
    (item: TrolleyObject, track: TrackId) => {
      const key = track === 1 ? "track1" : "track2";
      const current = board[key];
      if (current.length >= RUN_LIMITS.maxTrack) return;
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

  const dragStart = useCallback(() => {
    setDragging(true);
    zones.remeasure();
  }, [zones]);

  const dragMove = useCallback(
    (point: DragPoint) => {
      const zone = zones.hitTest(point.x, point.y);
      setHovered(zone === null ? null : trackOf(zone));
    },
    [zones],
  );

  const dropItem = useCallback(
    (item: TrolleyObject, point: DragPoint) => {
      setDragging(false);
      setHovered(null);
      const zone = zones.hitTest(point.x, point.y);
      if (zone !== null) place(item, trackOf(zone));
    },
    [place, zones],
  );

  const randomize = useCallback(() => {
    const drawn = randomTracks(catalogue.items, RUN_LIMITS.maxTrack, (pool, n) =>
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

  /** True once an answer has actually come back; before that there is no result. */
  const decided = (trolleySummary?.decisions.length ?? 0) > 0;

  return (
    <Screen title="Trolley Problems" subtitle="ἁμαξοστοιχία · the lever and the lesser evil">
      {/*
        The roster wears the quiet group heading the rest of the page's blocks
        wear: unlabelled, it was the one band on the screen with nothing naming
        it, which read as chrome above the content rather than the first step of
        it. Not a full section heading — five medallions with a name under each do
        not need a rule and a display-size title to be understood.
      */}
      <View className="border-t-hairline border-border pt-xl">
        <Subsection title="Characters">
          <RosterBar
            value={board.roster}
            onChange={(roster) => patch({ roster })}
            characters={characters}
            max={RUN_LIMITS.maxRoster}
            min={0}
            showRuns
            // Five circles with two faces in them already say "two of five".
            showCount={false}
          />
        </Subsection>
      </View>

      <Section
        title="Framing"
        right={
          <Button variant="link" size="sm" onPress={() => void prompt.show()}>
            <Text>View prompt</Text>
          </Button>
        }
      >
        <VariantSelect
          value={board.variant}
          onChange={(variant) => patch({ variant })}
          options={VARIANTS}
        />
      </Section>

      <Section title="Tracks">
        <TrackBoard
          track1={track1}
          track2={track2}
          onRemove={removeAt}
          zones={zones}
          hovered={hovered}
          arming={dragging || armed}
          max={RUN_LIMITS.maxTrack}
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
        {/*
          The screen's one instruction, on the seam between the board and the
          palette — and only while the board is bare. Once something is standing
          on a track the sentence is describing what the user has already done.
        */}
        {track1.length === 0 && track2.length === 0 ? (
          <Text variant="meta">Drag a tile onto a track, or tap one and choose.</Text>
        ) : null}
        <ObjectPalette
          items={catalogue.items}
          loading={catalogue.loading}
          canPlace={capacityLeft}
          onPlace={place}
          onDropItem={dropItem}
          onDragStart={dragStart}
          onDragMove={dragMove}
          onArmedChange={setArmed}
          onRandomize={randomize}
          onClear={clearTracks}
          onCreate={() => setCreatorOpen(true)}
        />
        {catalogue.error ? <Text className="text-destructive">{catalogue.error}</Text> : null}

        {/*
          The run belongs to the board: a heading and a rule over one button made a
          section out of the thing the section above is for. Instead it closes the
          section as a footer.
        */}
        <RunFooter
          blocked={blocked}
          cost={`${pluralize(total, "decision")} across ${pluralize(
            board.roster.length,
            "character",
          )}.`}
          label="Pull the lever"
          starting={starter.starting}
          onStart={() => void startRun()}
          run={run}
          error={starter.error}
        />
      </Section>

      {/*
        No heading over an absence: until the first answer lands there is nothing
        to call "Results", and a rule with one apologetic sentence under it was
        the emptiness written out twice.
      */}
      {decided ? (
        <Section title="Results">
          <TrolleyResults
            summary={trolleySummary}
            roster={board.roster}
            characters={characterIndex}
            runId={starter.runId}
          />
        </Section>
      ) : null}

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
        description="The puzzle's own words, closing as the selected character's answer style asks — the steering prompt the engine prepends is not shown here."
        panels={prompt.panels}
        loading={prompt.loading}
        error={prompt.error}
        viewpoints={prompt.viewpoints}
        viewpointId={prompt.viewpoint?.id}
        onViewpointChange={prompt.setViewpoint}
      />
    </Screen>
  );
}
