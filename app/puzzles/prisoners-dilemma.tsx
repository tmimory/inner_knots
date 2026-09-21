import { useCallback, useMemo } from "react";
import { View } from "react-native";

import { Avatar } from "@/components/avatars";
import { CountStepper } from "@/components/puzzles/count-stepper";
import {
  LabeledToggle,
  PayoffMatrix,
  PrisonersDilemmaResults,
  Subsection,
} from "@/components/puzzles/prisoners-dilemma";
import { PromptView, type PromptPanel } from "@/components/puzzles/prompt-view";
import { RosterBar } from "@/components/puzzles/roster-bar";
import { RunProgress } from "@/components/puzzles/run-progress";
import { Section } from "@/components/puzzles/section";
import { VariantSelect, type VariantOption } from "@/components/puzzles/variant-select";
import { Screen } from "@/components/shell";
import { Button, Label, Slider, Text, Textarea } from "@/components/ui";
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
        <View className="flex-1 gap-xl">
          {/* What the puzzle is: who plays it, and how it is put to them. */}
          <Section title="Setup" className="gap-xl">
            <Subsection title="The players">
              <RosterBar
                value={setup.roster}
                onChange={(roster) => patch({ roster })}
                characters={characters}
                max={PLAYER_COUNT}
                min={0}
                showRuns={false}
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

            <Subsection title="The framing">
              <VariantSelect
                value={setup.variant}
                onChange={(variant) => patch({ variant })}
                options={VARIANTS}
              />
            </Subsection>
          </Section>

          {/* What the puzzle's rules are: the charge, the bargain, the length. */}
          <Section title="Rules" className="gap-xl">
            <Subsection
              title="The charge"
              right={
                <Button
                  variant="link"
                  size="sm"
                  onPress={() => patch({ crimeUnlocked: !setup.crimeUnlocked })}
                >
                  <Text>{setup.crimeUnlocked ? "Done" : "Edit"}</Text>
                </Button>
              }
            >
              <Textarea
                rows={3}
                maxLength={RUN_LIMITS.crime}
                editable={setup.crimeUnlocked}
                // A character counter on a field nobody is typing in is a number
                // with nothing to say; it arrives with the cursor.
                showCount={setup.crimeUnlocked}
                value={setup.crime}
                onChangeText={(crime) => patch({ crime })}
                accessibilityLabel="The charge"
              />
              {setup.crimeUnlocked && setup.crime !== DEFAULT_CRIME ? (
                <View className="flex-row justify-end">
                  <Button variant="ghost" size="sm" onPress={() => patch({ crime: DEFAULT_CRIME })}>
                    <Text>Reset to default</Text>
                  </Button>
                </View>
              ) : null}
            </Subsection>

            <Subsection title="The payoffs">
              {/* `patch` widens cleanly: every key of the matrix is a key of the setup. */}
              <PayoffMatrix value={setup} onChange={patch} names={names} />
            </Subsection>

            <Subsection title="Game length">
              <VariantSelect
                value={setup.iterated ? "iterated" : "single"}
                onChange={(length) => patch({ iterated: length === "iterated" })}
                options={LENGTHS}
                label="Game length"
              />

              {setup.iterated ? (
                <View className="gap-xs">
                  <View className="flex-row items-center gap-md">
                    <Label>Rounds per game</Label>
                    <View className="flex-1" />
                    <Text className="font-mono">{setup.rounds}</Text>
                  </View>
                  <Slider
                    value={setup.rounds}
                    min={MIN_ITERATED_ROUNDS}
                    max={RUN_LIMITS.maxIterations}
                    step={1}
                    onValueChange={(rounds) => patch({ rounds })}
                    accessibilityLabel="Rounds per game"
                  />
                </View>
              ) : null}

              <View className="flex-row flex-wrap items-center gap-md">
                <Label>Games</Label>
                <CountStepper
                  value={setup.runs}
                  onChange={(runs) => patch({ runs })}
                  min={RUN_LIMITS.minRuns}
                  max={RUN_LIMITS.maxRuns}
                  label="Games"
                />
              </View>
            </Subsection>
          </Section>
        </View>

        {/*
          The rail stretches to the height of the setup column so its contents can
          stick: on the web the run controls stay in view however far down the
          payoff matrix you are.
        */}
        <View className="w-full wide:w-inspector wide:self-stretch">
          <View className="gap-xl web:sticky web:top-xl">
            <Section
              title="The run"
              divider={false}
              right={
                <Button variant="link" size="sm" onPress={() => void prompt.show()}>
                  <Text>Prompt view</Text>
                </Button>
              }
            >
              {/* The screen's one filled button, kept beside the results it fills. */}
              <View className="flex-row flex-wrap items-center gap-md">
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
              </View>

              <RunProgress run={run ?? null} />
              {starter.error ? (
                <Text className="text-destructive">{starter.error.message}</Text>
              ) : null}
            </Section>

            {/*
              Until a round exists there is nothing to head: an empty section with
              a rule and a paragraph saying so is the emptiness twice over.
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
            ) : (
              <Text variant="muted">Their answers appear here.</Text>
            )}
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
