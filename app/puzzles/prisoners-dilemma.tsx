import { useCallback, useMemo } from "react";
import { Pressable, View } from "react-native";

import { Avatar } from "@/components/avatars";
import { CountStepper } from "@/components/puzzles/count-stepper";
import {
  LabeledToggle,
  PayoffMatrix,
  PendingAnswers,
  PrisonersDilemmaResults,
  Subsection,
} from "@/components/puzzles/prisoners-dilemma";
import { PromptView, type PromptPanel } from "@/components/puzzles/prompt-view";
import { RosterBar } from "@/components/puzzles/roster-bar";
import { RunProgress } from "@/components/puzzles/run-progress";
import { Section } from "@/components/puzzles/section";
import { VariantSelect, type VariantOption } from "@/components/puzzles/variant-select";
import { Screen } from "@/components/shell";
import { Button, Label, Text, Textarea } from "@/components/ui";
import { previewPrisonersDilemmaPrompt } from "@/lib/client/prompts";
import { useCharacters } from "@/lib/client/use-characters";
import { usePersistedState } from "@/lib/client/use-persisted-state";
import { usePromptPreview } from "@/lib/client/use-prompt-preview";
import { useRun, useRunStarter } from "@/lib/client/use-run";
import type { Character } from "@/lib/domain/character";
import { DEFAULT_CRIME, RUN_LIMITS, type PrisonersDilemmaVariant } from "@/lib/domain/run";
import type { PrisonersDilemmaSummary } from "@/lib/domain/summary";
import { pluralize } from "@/lib/format";
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
    description: "A structure of incentives, stated as one. Nobody has been arrested.",
  },
  {
    id: "interrogation",
    label: "Interrogation room",
    description: "A bolted table, coffee gone cold, and a folder nobody has opened yet.",
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
    description: "The same partner, round after round, each told afterwards what the other chose.",
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

  const byId = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters],
  );

  const players = useMemo(() => seatedPlayers(setup, byId), [byId, setup]);
  const names = useMemo(() => playerNames(players), [players]);

  const patch = useCallback(
    (changes: Partial<PrisonersDilemmaSetup>) => setSetup({ ...setup, ...changes }),
    [setup, setSetup],
  );

  /**
   * Round one, as each player will read it. Both panels are composed from the
   * same config a run would send, so the preview cannot drift from the run.
   */
  const prompt = usePromptPreview(async () => {
    const preview = await previewPrisonersDilemmaPrompt({
      ...puzzleConfig(setup),
      ...playersOf(setup),
    });
    return (["a", "b"] as const).map((side, index): PromptPanel => {
      const character = players[side];
      return {
        label: `${PLAYER_LABELS[index]} · ${names[side]}`,
        accessory: character ? (
          <Avatar shape={character.avatar.shape} color={character.avatar.color} size="sm" />
        ) : undefined,
        system: preview[side].system,
        user: preview[side].user,
        options: preview[side].options,
      };
    });
  });

  /** True once a round has actually come back; before that there is nothing to show. */
  const decided = dilemma?.games.some((game) => game.rounds.length > 0) ?? false;

  const iterations = iterationsOf(setup);
  const blocked = blockedReason(setup);
  const total = decisionTotal(setup);

  async function startRun() {
    const seats = playersOf(setup);
    if (blocked !== null || seats === undefined) return;
    await starter.start({ puzzle: "prisoners-dilemma", ...puzzleConfig(setup), ...seats });
  }

  return (
    <Screen
      title="Prisoner's Dilemma"
      subtitle="πίστις · two rooms, one bargain, and no way to check"
    >
      {/*
        Configuration on the left, the run and its results on the right: the
        payoffs are what you change and the outcomes are what you change them
        for, and on a wide screen there is no reason to put a scroll between them.
      */}
      <View className="gap-xl pb-xl wide:flex-row wide:items-start">
        <View className="flex-1 gap-3xl">
          {/* What the puzzle is: who plays it, and how it is put to them. */}
          <Section title="Setup" className="gap-2xl">
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
                onCheckedChange={(relationshipsEnabled) => patch({ relationshipsEnabled })}
              />
              {setup.relationshipsEnabled ? (
                <View className="gap-lg">
                  {(["a", "b"] as const).map((side, index) => (
                    <View key={side} className="gap-xs">
                      <Label>{`${PLAYER_LABELS[index]} is told…`}</Label>
                      <Textarea
                        rows={2}
                        maxLength={RUN_LIMITS.relationship}
                        value={side === "a" ? setup.relationshipA : setup.relationshipB}
                        onChangeText={(text) =>
                          patch(side === "a" ? { relationshipA: text } : { relationshipB: text })
                        }
                        placeholder={
                          side === "a"
                            ? "You are your opponent's father."
                            : "You are your opponent's son."
                        }
                        accessibilityLabel={`What ${PLAYER_LABELS[index]} is told about the other player`}
                      />
                    </View>
                  ))}
                </View>
              ) : null}
            </Subsection>

            <Subsection title="Framing">
              <VariantSelect
                value={setup.variant}
                onChange={(variant) => patch({ variant })}
                options={VARIANTS}
              />
            </Subsection>
          </Section>

          {/* What the puzzle's rules are: the charge, the bargain, the length. */}
          <Section title="Rules" className="gap-2xl">
            <Subsection title="Charge">
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
                  <Text className="web:hover:underline">{setup.crime}</Text>
                </Pressable>
              )}
            </Subsection>

            <Subsection title="Payoffs">
              {/* `patch` widens cleanly: every key of the matrix is a key of the setup. */}
              <PayoffMatrix value={setup} onChange={patch} names={names} />
            </Subsection>

            <Subsection title="Game length">
              <VariantSelect
                value={setup.iterated ? "iterated" : "single"}
                onChange={(length) =>
                  patch(
                    length === "iterated"
                      ? { iterated: true }
                      : // A single game is one game: leaving a hidden count at
                        // seven would run seven of them without saying so.
                        { iterated: false, runs: RUN_LIMITS.minRuns },
                  )
                }
                options={LENGTHS}
                label="Game length"
              />

              {/*
                How long and how many are both questions the iterated game asks
                and the single one answers for itself, so they arrive together
                with it rather than sitting under "Single" doing nothing.
              */}
              {/*
                Two counts, one idiom: a slider for the rounds and a stepper for
                the games made two unrelated controls out of the same question,
                and a slider is a poor way to say "three". Each label keeps its
                own control immediately beside it rather than across a column of
                air, so the pair reads as one line of arithmetic.
              */}
              {setup.iterated ? (
                <View className="flex-row flex-wrap items-center gap-xl">
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
              ) : null}
            </Subsection>
          </Section>
        </View>

        {/*
          The rail stretches to the height of the setup column so its contents can
          stick: on the web the run controls stay in view however far down the
          payoff matrix you are. A hairline down its inside edge is what makes it
          a rail rather than a column of text that happens to sit on the right,
          and its heading takes the same rule-and-air as "Setup" so the two
          columns start on one line. The rule is drawn on the contents rather than
          on the full-height column: a line that runs a thousand pixels past the
          last thing in the rail is a divider between a page and nothing.
        */}
        <View className="w-full wide:w-inspector wide:self-stretch">
          <View className="gap-xl wide:border-l-hairline wide:border-border wide:pl-xl web:sticky web:top-xl">
            <Section title="Run">
              {/*
                The screen's one filled button, what stops it directly underneath,
                and the way to read what it will send — a strip, not a panel, for
                as long as there is nothing to report.
              */}
              <View className="items-start gap-sm">
                <Button
                  disabled={blocked !== null || starter.starting}
                  onPress={() => void startRun()}
                >
                  <Text>{starter.starting ? "Starting…" : "Put them in the rooms"}</Text>
                </Button>
                <Text variant="muted">
                  {blocked ??
                    `${pluralize(total, "decision")}: ${pluralize(setup.runs, "game")} × ${pluralize(
                      iterations,
                      "round",
                    )} × 2 players.`}
                </Text>
                <Button variant="link" size="sm" onPress={() => void prompt.show()}>
                  <Text>View prompt</Text>
                </Button>
              </View>

              <RunProgress run={run ?? null} />
              {starter.error ? (
                <Text className="text-destructive">{starter.error.message}</Text>
              ) : null}

              {/*
                Until a round exists there is nothing to head: a second heading
                with a rule and a paragraph under it is the emptiness twice over.
                The two rows that are waiting say it instead.
              */}
              {decided ? null : <PendingAnswers players={players} />}
            </Section>

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
          </View>
        </View>
      </View>

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
