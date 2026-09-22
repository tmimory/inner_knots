import { useCallback, useMemo } from "react";
import { Pressable, View } from "react-native";

import { Avatar } from "@/components/avatars";
import { decisionStyleMeta } from "@/components/characters/labels";
import { CountStepper } from "@/components/puzzles/count-stepper";
import {
  LabeledToggle,
  PayoffMatrix,
  PendingAnswers,
  PrisonersDilemmaResults,
} from "@/components/puzzles/prisoners-dilemma";
import { PromptView, type PromptPanel } from "@/components/puzzles/prompt-view";
import { RosterBar } from "@/components/puzzles/roster-bar";
import { RunFooter } from "@/components/puzzles/run-footer";
import { Section } from "@/components/puzzles/section";
import { Subsection } from "@/components/puzzles/subsection";
import {
  VariantSelect,
  type VariantOption,
} from "@/components/puzzles/variant-select";
import { Screen } from "@/components/shell";
import { Button, Label, Text, Textarea } from "@/components/ui";
import { previewPrisonersDilemmaPrompt } from "@/lib/client/prompts";
import { useCharacters } from "@/lib/client/use-characters";
import { usePersistedState } from "@/lib/client/use-persisted-state";
import { usePromptPreview } from "@/lib/client/use-prompt-preview";
import { useRun, useRunStarter } from "@/lib/client/use-run";
import type { Character } from "@/lib/domain/character";
import {
  DEFAULT_CRIME,
  RUN_LIMITS,
  type PrisonersDilemmaVariant,
} from "@/lib/domain/run";
import type { PrisonersDilemmaSummary } from "@/lib/domain/summary";
import { pluralize } from "@/lib/format";
import { indexById } from "@/lib/utils";
import {
  DEFAULT_SETUP,
  MIN_ITERATED_ROUNDS,
  PLAYER_COUNT,
  PLAYER_LABELS,
  blockedReason,
  decisionTotal,
  iterationsOf,
  parseSetup,
  playerNames,
  playersOf,
  puzzleConfig,
  type PrisonersDilemmaSetup,
} from "@/lib/puzzles/prisoners-dilemma/ui-helpers";

/**
 * How the two framings are described in the interface.
 *
 * UI copy: what the model reads lives in `prompts/prisoners-dilemma/variant-*.md`
 * and is never duplicated here.
 */
const VARIANTS: readonly VariantOption<PrisonersDilemmaVariant>[] = [
  {
    id: "thought-experiment",
    label: "Thought experiment",
    description:
      "A structure of incentives, stated as one. Nobody has been arrested.",
  },
  {
    id: "interrogation",
    label: "Interrogation room",
    description:
      "A bolted table, coffee gone cold, and a folder nobody has opened yet.",
  },
];

/** Whether the bargain is put once or put again and again. */
type Length = "single" | "iterated";

const LENGTHS: readonly VariantOption<Length>[] = [
  {
    id: "single",
    label: "Single",
    description: "One round. One answer each, and that is the whole of it.",
  },
  {
    id: "iterated",
    label: "Iterated",
    description:
      "The same partner, round after round, each told afterwards what the other chose.",
  },
];

/** The two seats' characters, by position, once the roster has been resolved. */
function seatedPlayers(
  setup: PrisonersDilemmaSetup,
  byId: ReadonlyMap<string, Character>,
): { a?: Character; b?: Character } {
  return {
    a: setup.roster[0] ? byId.get(setup.roster[0].characterId) : undefined,
    b: setup.roster[1] ? byId.get(setup.roster[1].characterId) : undefined,
  };
}

export default function PrisonersDilemmaScreen() {
  const { characters } = useCharacters();
  const [setup, setSetup] = usePersistedState<PrisonersDilemmaSetup>(
    "puzzles.prisoners-dilemma",
    DEFAULT_SETUP,
    parseSetup,
  );

  const starter = useRunStarter();
  const { run, summary } = useRun(starter.runId);
  const dilemma: PrisonersDilemmaSummary | undefined =
    summary?.kind === "prisoners-dilemma" ? summary : undefined;

  const byId = useMemo(() => indexById(characters), [characters]);

  const players = useMemo(() => seatedPlayers(setup, byId), [byId, setup]);
  const names = useMemo(() => playerNames(players), [players]);

  const patch = useCallback(
    (changes: Partial<PrisonersDilemmaSetup>) =>
      setSetup({ ...setup, ...changes }),
    [setup, setSetup],
  );

  /**
   * Round one, as each player will read it. Both panels are composed from the
   * same config a run would send, so the preview cannot drift from the run —
   * including the last paragraph, which the route derives from the character in
   * each seat. Two seats mean two endings on one sheet, so this screen wants no
   * "Viewing as" selector: both viewpoints are already on it.
   */
  const prompt = usePromptPreview(async () => {
    const preview = await previewPrisonersDilemmaPrompt({
      ...puzzleConfig(setup),
      ...playersOf(setup),
    });
    return (["a", "b"] as const).map((side, index): PromptPanel => {
      const character = players[side];
      return {
        label: character ? `${PLAYER_LABELS[index]} · ${names[side]}` : PLAYER_LABELS[index],
        accessory: character ? (
          <Avatar
            shape={character.avatar.shape}
            color={character.avatar.color}
            size="sm"
          />
        ) : undefined,
        meta: decisionStyleMeta(preview.decisionStyles[side], character?.provider),
        system: preview[side].system,
        user: preview[side].user,
        options: preview[side].options,
      };
    });
  });

  /** True once a round has actually come back; before that there is nothing to show. */
  const decided =
    dilemma?.games.some((game) => game.rounds.length > 0) ?? false;
  /** True once a run has been asked for: the table has something to be waiting for. */
  const started = starter.runId !== null;

  const iterations = iterationsOf(setup);
  const blocked = blockedReason(setup);
  const total = decisionTotal(setup);

  async function startRun() {
    const seats = playersOf(setup);
    if (blocked !== null || seats === undefined) return;
    await starter.start({
      puzzle: "prisoners-dilemma",
      ...puzzleConfig(setup),
      ...seats,
    });
  }

  return (
    <Screen
      title="Prisoner's Dilemma"
      subtitle="πίστις · two rooms, one bargain, and no way to check"
    >
      {/* What the puzzle is: who plays it, and how it is put to them. */}
      <Section title="Setup">
        {/*
          One band of air between groups, on its own box rather than on the
          section's: a `gap-*` passed down to `FormSection` loses to the one
          already on it, since tailwind-merge does not know this project's
          named spacing scale.
        */}
        <View className="gap-3xl">
          <Subsection title="Players">
            <RosterBar
              value={setup.roster}
              onChange={(roster) => patch({ roster })}
              characters={characters}
              max={PLAYER_COUNT}
              min={0}
              showRuns={false}
              showCount={false}
              labels={PLAYER_LABELS}
              fixedSlots={PLAYER_COUNT}
              allowDuplicates
            />

            {/*
              Whether they know each other is a fact about the two of them, not
              a chapter of its own: it belongs under the seats it describes.
            */}
            <LabeledToggle
              label="Tell each who the other one is"
              checked={setup.relationshipsEnabled}
              onCheckedChange={(relationshipsEnabled) =>
                patch({ relationshipsEnabled })
              }
            />
            {setup.relationshipsEnabled ? (
              <View className="gap-lg">
                {(["a", "b"] as const).map((side, index) => (
                  // One sentence does not want seven hundred pixels: the pair
                  // is capped at the measure a line of prose is read at, and
                  // the label sits the screen's own step above its field.
                  <View key={side} className="max-w-measure gap-md">
                    <Label>{`${names[side]} is told…`}</Label>
                    <Textarea
                      rows={2}
                      maxLength={RUN_LIMITS.relationship}
                      value={
                        side === "a" ? setup.relationshipA : setup.relationshipB
                      }
                      onChangeText={(text) =>
                        patch(
                          side === "a"
                            ? { relationshipA: text }
                            : { relationshipB: text },
                        )
                      }
                      placeholder={
                        side === "a"
                          ? "You are your opponent's father."
                          : "You are your opponent's son."
                      }
                      accessibilityLabel={`What ${names[side]} is told about the other player`}
                    />
                  </View>
                ))}
              </View>
            ) : null}
          </Subsection>

          {/*
            The words the run will send hang off the framing that chooses them,
            the way the trolley hangs them off its own: a link at the end of the
            heading row of the group it belongs to, rather than a third control
            under the button that starts the run.
          */}
          <Subsection
            title="Framing"
            right={
              <Button variant="link" size="sm" onPress={() => void prompt.show()}>
                <Text>View prompt</Text>
              </Button>
            }
          >
            <VariantSelect
              value={setup.variant}
              onChange={(variant) => patch({ variant })}
              options={VARIANTS}
            />
          </Subsection>
        </View>
      </Section>

      {/* What the puzzle's rules are: the charge, the bargain, the length. */}
      <Section title="Rules">
        <View className="gap-3xl">
          <View className="gap-md">
            {/*
              Locked, the charge is prose on the page rather than a field that
              has been switched off: grey text in a sunken box reads as broken
              twice over — an input nobody may type in, holding what looks like
              a placeholder. The sentence is its own edit control — press the
              words to change the words — rather than a link parked at the far
              end of a heading row, three hundred pixels from the thing it acts
              on and indistinguishable from the links that open dialogs.
            */}
            {setup.crimeUnlocked ? (
              <>
                <Textarea
                  rows={3}
                  maxLength={RUN_LIMITS.crime}
                  // A character counter on a field nobody is typing in is a
                  // number with nothing to say; it arrives with the cursor.
                  showCount
                  autoFocus
                  value={setup.crime}
                  onChangeText={(crime) => patch({ crime })}
                  accessibilityLabel="The charge"
                />
                <View className="flex-row justify-end gap-md">
                  {setup.crime !== DEFAULT_CRIME ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => patch({ crime: DEFAULT_CRIME })}
                    >
                      <Text>Reset to default</Text>
                    </Button>
                  ) : null}
                  <Button
                    variant="link"
                    size="sm"
                    onPress={() => patch({ crimeUnlocked: false })}
                  >
                    <Text>Done</Text>
                  </Button>
                </View>
              </>
            ) : (
              <Pressable
                role="button"
                accessibilityLabel={`The charge: ${setup.crime}. Activate to edit it.`}
                onPress={() => patch({ crimeUnlocked: true })}
                className="self-start"
              >
                <Text className="font-bodyItalic text-muted-foreground web:hover:underline">
                  {setup.crime}
                </Text>
              </Pressable>
            )}
          </View>

          <Subsection title="Payoffs">
            {/* `patch` widens cleanly: every key of the matrix is a key of the setup. */}
            <PayoffMatrix
              value={setup}
              onChange={patch}
              names={names}
              players={players}
            />
          </Subsection>

          <Subsection title="Game length">
            <VariantSelect
              value={setup.iterated ? "iterated" : "single"}
              onChange={(length) => patch({ iterated: length === "iterated" })}
              options={LENGTHS}
              label="Game length"
            />

            {/*
              How many games is a question both lengths ask — twenty single
              bargains are twenty readings of the same bargain, not one — so the
              stepper stands whichever length is picked, and the switch no longer
              reaches over and resets it. Only how long one game runs belongs to
              the iterated game alone.
            */}
            {/*
              Two counts, one idiom: a slider for the rounds and a stepper for
              the games made two unrelated controls out of the same question,
              and a slider is a poor way to say "three". Each label keeps its
              own control immediately beside it rather than across a column of
              air, so the pair reads as one line of arithmetic.
            */}
            <View className="flex-row flex-wrap items-center gap-3xl">
              {setup.iterated ? (
                <View className="flex-row items-center gap-md">
                  <Label>Rounds per game</Label>
                  <CountStepper
                    value={setup.rounds}
                    onChange={(rounds) => patch({ rounds })}
                    min={MIN_ITERATED_ROUNDS}
                    max={RUN_LIMITS.maxIterations}
                    label="Rounds per game"
                  />
                </View>
              ) : null}

              <View className="flex-row items-center gap-md">
                <Label>Games</Label>
                <CountStepper
                  value={setup.runs}
                  onChange={(runs) => patch({ runs })}
                  min={RUN_LIMITS.minRuns}
                  max={RUN_LIMITS.maxRuns}
                  label="Games"
                />
              </View>
            </View>
          </Subsection>
        </View>

        {/* The run closes the rules rather than opening a section of its own. */}
        <RunFooter
          blocked={blocked}
          cost={`${pluralize(total, "decision")}: ${pluralize(setup.runs, "game")} × ${pluralize(
            iterations,
            "round",
          )} × ${pluralize(PLAYER_COUNT, "player")}.`}
          label="Put them in the rooms"
          starting={starter.starting}
          onStart={() => void startRun()}
          run={run}
          error={starter.error}
        />

        {/*
          Between the button and the first answer, the shape the results will
          take: two named rows and the em dash that stands where a choice will
          go, so the empty table and the filled one are the same table. Before
          the run there is nothing waiting, and nothing is drawn — in one column
          the button is already the last thing on the page.
        */}
        {started && !decided ? <PendingAnswers players={players} /> : null}
      </Section>

      {/*
        No heading over an absence: until the first round comes back there is
        nothing to call a result.
      */}
      {decided ? (
        <Section title="What they chose">
          <PrisonersDilemmaResults
            summary={dilemma}
            players={players}
            iterations={iterations}
            runId={starter.runId}
          />
        </Section>
      ) : null}

      <PromptView
        open={prompt.open}
        onOpenChange={prompt.setOpen}
        title="Prisoner's dilemma prompts"
        description="Round one, as each player will read it. The character's steering prompt is prepended by the engine and is not shown here."
        panels={prompt.panels}
        loading={prompt.loading}
        error={prompt.error}
      />
    </Screen>
  );
}
