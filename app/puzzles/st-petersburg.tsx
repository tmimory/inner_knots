import { useCallback, useMemo } from "react";
import { View } from "react-native";

import { CountStepper } from "@/components/puzzles/count-stepper";
import { PromptView } from "@/components/puzzles/prompt-view";
import { RosterBar } from "@/components/puzzles/roster-bar";
import { RunFooter } from "@/components/puzzles/run-footer";
import { Section } from "@/components/puzzles/section";
import { FacePanel, StPetersburgResults } from "@/components/puzzles/st-petersburg";
import { Subsection } from "@/components/puzzles/subsection";
import { Screen } from "@/components/shell";
import { Button, Label, Text } from "@/components/ui";
import { previewStPetersburgPrompt } from "@/lib/client/prompts";
import { useCharacters } from "@/lib/client/use-characters";
import { usePersistedState } from "@/lib/client/use-persisted-state";
import { seatedCharacters, usePromptPreview } from "@/lib/client/use-prompt-preview";
import { useRun, useRunStarter } from "@/lib/client/use-run";
import { COIN_FACES, RUN_LIMITS, type CoinFace, type CoinFaceRule } from "@/lib/domain/run";
import type { StPetersburgSummary } from "@/lib/domain/summary";
import { pluralize } from "@/lib/format";
import {
  DEFAULT_SETUP,
  blockedReason,
  gameTotal,
  parseSetup,
  puzzleConfig,
  type StPetersburgSetup,
} from "@/lib/puzzles/st-petersburg/ui-helpers";
import { indexById } from "@/lib/utils";

export default function StPetersburgScreen() {
  const { characters } = useCharacters();
  const [setup, setSetup] = usePersistedState<StPetersburgSetup>(
    "puzzles.st-petersburg",
    DEFAULT_SETUP,
    parseSetup,
  );

  const byId = useMemo(() => indexById(characters), [characters]);

  /** The roster's characters, in seat order: the faces the preview may be read as. */
  const seated = useMemo(() => seatedCharacters(setup.roster, byId), [byId, setup.roster]);

  const patch = useCallback(
    (changes: Partial<StPetersburgSetup>) => setSetup({ ...setup, ...changes }),
    [setSetup, setup],
  );

  /**
   * The prompt as one of the seated characters will read it — flip one, with
   * nothing tossed yet. The closing paragraph belongs to whoever answers (a
   * TypeSafe character is never shown a response format), so the style travels
   * with the selected viewpoint and an empty roster falls back to the route's
   * default. The body is exactly what a run sends, so the two cannot drift.
   */
  const prompt = usePromptPreview(
    async (viewpoint) => {
      const { prompt: composed } = await previewStPetersburgPrompt({
        ...puzzleConfig(setup),
        decisionStyle: viewpoint?.decisionStyle,
      });
      return [{ system: composed.system, user: composed.user, options: composed.options }];
    },
    { characters: seated },
  );

  const starter = useRunStarter();
  const { run, summary } = useRun(starter.runId);
  const coin: StPetersburgSummary | undefined =
    summary?.kind === "st-petersburg" ? summary : undefined;

  const setFace = useCallback(
    (face: CoinFace, value: CoinFaceRule) => patch({ faces: { ...setup.faces, [face]: value } }),
    [patch, setup.faces],
  );

  const blocked = blockedReason(setup);
  const total = gameTotal(setup);

  /** True once a turn has actually come back; before that there is no result. */
  const decided = coin?.games.some((game) => game.flips.length > 0) ?? false;

  async function startRun() {
    if (blocked !== null) return;
    await starter.start({
      puzzle: "st-petersburg",
      ...puzzleConfig(setup),
      roster: setup.roster,
    });
  }

  return (
    <Screen
      title="The Coin of St. Petersburg"
      subtitle="τύχη · a coin, a voice, and the next flip"
    >
      {/*
        The roster wears the quiet group heading the rest of the page's blocks
        wear, as the trolley's does: unlabelled it reads as chrome above the
        content rather than as the first step of it, and five medallions with a
        name under each do not need a rule and a display-size title.
      */}
      <View className="border-t-hairline border-border pt-xl">
        <Subsection title="Characters">
          <RosterBar
            value={setup.roster}
            onChange={(roster) => patch({ roster })}
            characters={characters}
            max={RUN_LIMITS.maxRoster}
            min={0}
            // The run count is how many games that character plays.
            showRuns
            showCount={false}
          />
        </Subsection>
      </View>

      <Section
        title="The coin"
        right={
          <Button variant="link" size="sm" onPress={() => void prompt.show()}>
            <Text>View prompt</Text>
          </Button>
        }
      >
        <View className="gap-3xl">
          {/*
            The two faces are one object seen from both sides, so they sit beside
            each other wherever there is room for two columns of prose and stack
            below that — a payoff read two screens under the one it is weighed
            against is not a coin, it is two settings.
          */}
          <View className="gap-3xl wide:flex-row">
            {COIN_FACES.map((face) => (
              <FacePanel
                key={face}
                face={face}
                value={setup.faces[face]}
                onChange={(value) => setFace(face, value)}
                className="wide:flex-1"
              />
            ))}
          </View>

          <Subsection title="Game length">
            {/*
              The label keeps its control immediately beside it rather than
              across a column of air, as the dilemma's counts do, so the pair
              reads as one line of arithmetic.
            */}
            <View className="flex-row items-center gap-md">
              <Label>Flips at most</Label>
              <CountStepper
                value={setup.maxFlips}
                onChange={(maxFlips) => patch({ maxFlips })}
                min={RUN_LIMITS.minFlips}
                max={RUN_LIMITS.maxFlips}
                label="Flips at most"
              />
            </View>
          </Subsection>
        </View>

        {/* The run closes the coin's own section rather than opening one of its own. */}
        <RunFooter
          blocked={blocked}
          cost={`${pluralize(total, "game")} across ${pluralize(
            setup.roster.length,
            "character",
          )}, at most ${pluralize(setup.maxFlips, "flip")} each.`}
          label="Flip it"
          starting={starter.starting}
          onStart={() => void startRun()}
          run={run}
          error={starter.error}
        />
      </Section>

      {/*
        No heading over an absence: until the first turn comes back there is
        nothing to call a result.
      */}
      {decided ? (
        <Section title="Results">
          <StPetersburgResults
            summary={coin}
            roster={setup.roster}
            characters={byId}
            maxFlips={setup.maxFlips}
            runId={starter.runId}
          />
        </Section>
      ) : null}

      <PromptView
        open={prompt.open}
        onOpenChange={prompt.setOpen}
        title="Coin prompt"
        description="The first flip, as the selected character will read it — later turns carry the tosses so far. The steering prompt the engine prepends is not shown here."
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
