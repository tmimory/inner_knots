import { useMemo } from "react";
import { View } from "react-native";

import { Histogram, type HistogramGroupSpec, type HistogramSeriesSpec } from "@/components/charts";
import { ResultsFooter } from "@/components/puzzles/results-footer";
import { rosterGroups } from "@/components/puzzles/roster-groups";
import type { Character } from "@/lib/domain/character";
import type { RosterEntry } from "@/lib/domain/run";
import type { TrolleySummary } from "@/lib/domain/summary";
import { countNote, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The two answers, in the two hues the board draws its rails in. */
const SERIES: HistogramSeriesSpec[] = [
  { id: "track1", label: "Track 1", color: "primary" },
  { id: "track2", label: "Track 2", color: "track2" },
];

export type TrolleyResultsProps = {
  /** The summary as it stands; the engine rewrites it after every decision. */
  summary: TrolleySummary | undefined;
  /** The roster, so a character that has not answered yet still gets a row. */
  roster: readonly RosterEntry[];
  characters: ReadonlyMap<string, Character>;
  /** Links to the run's page in the logs, once there is a run. */
  runId?: string | null;
  className?: string;
};

/**
 * How the roster answered: one cluster of bars per character.
 *
 * Characters are the groups and the two tracks are the series, rather than the
 * other way round, because the question the screen exists to answer is "does this
 * character prefer one track?" — and that reads off a pair of adjacent bars.
 * Failed decisions are counted beside the bars instead of being dropped, so a
 * character with three answers and seven refusals cannot be mistaken for one that
 * simply answered three times.
 */
export function TrolleyResults({
  summary,
  roster,
  characters,
  runId,
  className,
}: TrolleyResultsProps) {
  const groups = useMemo(
    (): HistogramGroupSpec[] =>
      rosterGroups(roster, summary?.perCharacter ?? {}, characters).map(
        (group) =>
          ({
            id: group.id,
            label: group.name,
            values: { track1: group.tally?.track1 ?? 0, track2: group.tally?.track2 ?? 0 },
            weights: group.tally?.meanWeights,
            note: countNote(group.tally?.errors ?? 0, "error"),
            accessory: group.accessory,
          }) satisfies HistogramGroupSpec,
      ),
    [characters, roster, summary],
  );

  const answered = summary?.decisions.length ?? 0;

  // Nothing is worth drawing before a decision exists — and the screen does not
  // head a section that has nothing under it, so there is not even a sentence to
  // write here: the whole block stays away until the first answer lands.
  if (answered === 0) return null;

  return (
    <View className={cn("gap-lg", className)}>
      <Histogram
        series={SERIES}
        groups={groups}
      />

      <ResultsFooter note={`${pluralize(answered, "decision")} recorded`} runId={runId} />
    </View>
  );
}
