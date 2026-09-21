import { useCallback, useMemo } from "react";
import { View } from "react-native";

import { Avatar } from "@/components/avatars";
import { CountStepper } from "@/components/puzzles/count-stepper";
import { PayoffMatrix, PrisonersDilemmaResults } from "@/components/puzzles/prisoners-dilemma";
import { PromptView, type PromptPanel } from "@/components/puzzles/prompt-view";
import { RosterBar } from "@/components/puzzles/roster-bar";
import { RunProgress } from "@/components/puzzles/run-progress";
import { Section } from "@/components/puzzles/section";
import { VariantSelect, type VariantOption } from "@/components/puzzles/variant-select";
import { PageHeader } from "@/components/shell";
import { Button, Label, Slider, Switch, Text, Textarea } from "@/components/ui";
import { previewPrisonersDilemmaPrompt } from "@/lib/client/prompts";
import { useCharacters } from "@/lib/client/use-characters";
import { usePersistedState } from "@/lib/client/use-persisted-state";
import { usePromptPreview } from "@/lib/client/use-prompt-preview";
import { useRun, useRunStarter } from "@/lib/client/use-run";
import { characterDisplayName, type Character } from "@/lib/domain/character";
import { DEFAULT_CRIME, RUN_LIMITS, type PrisonersDilemmaVariant } from "@/lib/domain/run";
import type { PrisonersDilemmaSummary } from "@/lib/domain/summary";
import { pluralize } from "@/lib/format";
import {
  DEFAULT_SETUP,
  MIN_ITERATED_ROUNDS,
  PLAYER_COUNT,
  blockedReason,
  decisionTotal,
  iterationsOf,
  parseSetup,
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

const SLOT_LABELS = ["Player A", "Player B"] as const;

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
  const names = useMemo(
    () => ({
      a: players.a ? characterDisplayName(players.a) : "Player A",
      b: players.b ? characterDisplayName(players.b) : "Player B",
    }),
    [players.a, players.b],
  );

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
        label: `${SLOT_LABELS[index]} · ${names[side]}`,
        accessory: character ? (
          <Avatar shape={character.avatar.shape} color={character.avatar.color} size="sm" />
        ) : undefined,
        system: preview[side].system,
        user: preview[side].user,
        options: preview[side].options,
      };
    });
  });

  const iterations = iterationsOf(setup);
  const blocked = blockedReason(setup);
  const total = decisionTotal(setup);

  async function startRun() {
    const seats = playersOf(setup);
    if (blocked !== null || seats === undefined) return;
    await starter.start({ puzzle: "prisoners-dilemma", ...puzzleConfig(setup), ...seats });
  }

  return (
    <View className="gap-lg">
      <PageHeader
        title="Prisoner's Dilemma"
        subtitle="πίστις · two rooms, one bargain, and no way to check"
      />
      <Text variant="lead">
        Seat two characters on either side of the same bargain, tell them who the other one is,
        and see whether trust survives being worth something.
      </Text>

      <Section
        title="The players"
        description="Two seats, two rooms. Both have to be filled before anyone is asked anything."
      >
        <RosterBar
          value={setup.roster}
          onChange={(roster) => patch({ roster })}
          characters={characters}
          max={PLAYER_COUNT}
          min={0}
          showRuns={false}
          labels={SLOT_LABELS}
          fixedSlots={PLAYER_COUNT}
          allowDuplicates
        />
      </Section>

      <Section
        title="Relationships"
        description="Who the other one is, in each player's own terms."
        right={
          <Switch
            checked={setup.relationshipsEnabled}
            onCheckedChange={(relationshipsEnabled) => patch({ relationshipsEnabled })}
            accessibilityLabel="Give the players a relationship"
          />
        }
      >
        {setup.relationshipsEnabled ? (
          <View className="gap-md">
            {(["a", "b"] as const).map((side, index) => (
              <View key={side} className="gap-xs">
                <Label>{`${SLOT_LABELS[index]} is told…`}</Label>
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
                  accessibilityLabel={`What ${SLOT_LABELS[index]} is told about the other player`}
                />
              </View>
            ))}
          </View>
        ) : (
          <Text variant="muted">
            Off, the two of them are strangers who happen to share a charge.
          </Text>
        )}
      </Section>

      <Section
        title="The framing"
        description="The same bargain, asked two ways."
        right={
          <Button variant="outline" size="sm" onPress={() => void prompt.show()}>
            <Text>Prompt View</Text>
          </Button>
        }
      >
        <VariantSelect
          value={setup.variant}
          onChange={(variant) => patch({ variant })}
          options={VARIANTS}
        />
      </Section>

      <Section
        title="The charge"
        description="What the two of them are accused of, in the words the prompt will use."
        right={
          <>
            <Text variant="muted">{setup.crimeUnlocked ? "unlocked" : "locked"}</Text>
            <Switch
              checked={setup.crimeUnlocked}
              onCheckedChange={(crimeUnlocked) => patch({ crimeUnlocked })}
              accessibilityLabel="Edit the charge"
            />
          </>
        }
      >
        <Textarea
          rows={3}
          maxLength={RUN_LIMITS.crime}
          editable={setup.crimeUnlocked}
          value={setup.crime}
          onChangeText={(crime) => patch({ crime })}
          accessibilityLabel="The charge"
        />
        {setup.crime !== DEFAULT_CRIME ? (
          <View className="flex-row justify-end">
            <Button variant="ghost" size="sm" onPress={() => patch({ crime: DEFAULT_CRIME })}>
              <Text>Reset to default</Text>
            </Button>
          </View>
        ) : null}
      </Section>

      <Section
        title="The payoffs"
        description="Four outcomes, in whatever currency you like — years, fines, or walking free."
      >
        {/* `patch` widens cleanly: every key of the matrix is a key of the setup. */}
        <PayoffMatrix value={setup} onChange={patch} names={names} />
      </Section>

      <Section
        title="Game length"
        description="Put the bargain once, or put it to the same pair again and again."
      >
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
          <Text variant="muted">Each game starts from a clean slate.</Text>
        </View>
      </Section>

      <Section
        title="The run"
        description={
          blocked ??
          `${pluralize(total, "decision")}: ${pluralize(setup.runs, "game")} × ${pluralize(
            iterations,
            "round",
          )} × 2 players.`
        }
        right={
          <Button disabled={blocked !== null || starter.starting} onPress={() => void startRun()}>
            <Text>{starter.starting ? "Starting…" : "Put them in the rooms"}</Text>
          </Button>
        }
      >
        <RunProgress run={run ?? null} idleMessage="No run started yet." />
        {starter.error ? <Text className="text-destructive">{starter.error.message}</Text> : null}
      </Section>

      <Section title="What they chose" description="Counts per player, how the rounds came out.">
        <PrisonersDilemmaResults
          summary={dilemma}
          players={players}
          iterations={iterations}
          runId={starter.runId}
        />
      </Section>

      <PromptView
        open={prompt.open}
        onOpenChange={prompt.setOpen}
        title="Prisoner's dilemma prompts"
        description="Round one, as each player will read it. The character's steering prompt is prepended by the engine and is not shown here."
        panels={prompt.panels}
        loading={prompt.loading}
        error={prompt.error}
      />
    </View>
  );
}
