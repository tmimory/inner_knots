import { Link } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";

import { Avatar } from "@/components/avatars";
import { Histogram, type HistogramGroupSpec, type HistogramSeriesSpec } from "@/components/charts";
import { Button, Label, Text } from "@/components/ui";
import type { Character } from "@/lib/domain/character";
import type { PlayerTally, PrisonersDilemmaSummary } from "@/lib/domain/summary";
import { countNote, pluralize } from "@/lib/format";
import { playerNames } from "@/lib/puzzles/prisoners-dilemma/ui-helpers";
import { cn } from "@/lib/utils";

import { OutcomeGrid } from "./outcome-grid";
import { RoundGrid } from "./round-grid";

/** The two moves, pinned to the theme's comparison pair, everywhere on the screen. */
const SERIES: HistogramSeriesSpec[] = [
  { id: "testify", label: "Testify", color: "track1" },
  { id: "silent", label: "Stay silent", color: "track2" },
];

const EMPTY_TALLY: PlayerTally = { testify: 0, silent: 0, errors: 0 };

export type PrisonersDilemmaResultsProps = {
  /** The summary as it stands; the engine rewrites it after every decision. */
  summary: PrisonersDilemmaSummary | undefined;
  /** The seated characters, for names and faces. Either may be empty. */
  players: { a?: Character; b?: Character };
  /** Rounds a full game runs to; above one, the round grid is worth drawing. */
  iterations: number;
  runId?: string | null;
  className?: string;
};

/** One count of the outcome table. */
function OutcomeCell({ value }: { value: number }) {
  return (
    <View className="min-h-control-md justify-center">
      <Text className="font-mono text-xl">{value}</Text>
    </View>
  );
}

/**
 * How the two of them played: the counts, the outcomes, and the rounds themselves.
 *
 * The histogram's groups are the players and its series are the two moves, so
 * "does this one testify more than that one?" reads off a pair of columns; both
 * are scaled against the same longest bar, which is what makes the columns
 * comparable. The four outcomes are laid out as the payoff matrix is, so a
 * count sits where the bargain that produced it sits. Failed decisions are
 * counted beside the bars and shown as gaps in the round grid rather than
 * dropped — a player that would not answer is a result.
 */
export function PrisonersDilemmaResults({
  summary,
  players,
  iterations,
  runId,
  className,
}: PrisonersDilemmaResultsProps) {
  const names = useMemo(() => playerNames(players), [players]);

  const groups = useMemo((): HistogramGroupSpec[] => {
    return (["a", "b"] as const).map((side) => {
      const tally = summary?.perPlayer[side] ?? EMPTY_TALLY;
      const character = players[side];
      return {
        id: side,
        label: names[side],
        values: { testify: tally.testify, silent: tally.silent },
        weights: tally.meanWeights,
        note: countNote(tally.errors, "error"),
        accessory: character ? (
          <Avatar shape={character.avatar.shape} color={character.avatar.color} size="sm" />
        ) : undefined,
      } satisfies HistogramGroupSpec;
    });
  }, [names, players, summary]);

  const rounds = summary?.games.reduce((sum, game) => sum + game.rounds.length, 0) ?? 0;

  // Before a round exists there is nothing to chart: zero tiles and an empty
  // legend are a dashboard pretending to have data, and so is a paragraph
  // explaining that there is no data.
  if (summary === undefined || rounds === 0) {
    return (
      <Text variant="muted" className={className}>
        Nothing decided yet.
      </Text>
    );
  }

  const outcomes = summary.outcomes;

  return (
    <View className={cn("gap-lg", className)}>
      <Histogram series={SERIES} groups={groups} sideBySide />

      {/* The four outcomes where the payoff matrix puts them: A down, B across. */}
      <OutcomeGrid
        rowPlayer={names.a}
        columnPlayer={names.b}
        cells={[
          <OutcomeCell key="both-testify" value={outcomes.bothTestify} />,
          <OutcomeCell key="only-a" value={outcomes.onlyATestifies} />,
          <OutcomeCell key="only-b" value={outcomes.onlyBTestifies} />,
          <OutcomeCell key="both-silent" value={outcomes.bothSilent} />,
        ]}
        footnote={
          outcomes.incomplete > 0 ? (
            <Text variant="muted">
              {`${pluralize(outcomes.incomplete, "round")} never came out: one of them would not answer.`}
            </Text>
          ) : undefined
        }
      />

      {iterations > 1 ? (
        <View className="gap-sm">
          <Label>Round by round</Label>
          <RoundGrid games={summary.games} rounds={iterations} names={names} />
        </View>
      ) : null}

      <View className="flex-row flex-wrap items-center gap-md">
        <Text variant="muted">{`${pluralize(rounds, "round")} recorded`}</Text>
        <View className="flex-1" />
        {runId ? (
          <Link href={`/logs/${runId}`} asChild>
            <Button variant="outline" size="sm">
              <Text>View in Logs</Text>
            </Button>
          </Link>
        ) : null}
      </View>
    </View>
  );
}
