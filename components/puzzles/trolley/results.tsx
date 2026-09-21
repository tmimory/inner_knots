import { Link } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";

import { Avatar } from "@/components/avatars";
import { Histogram, type HistogramGroupSpec, type HistogramSeriesSpec } from "@/components/charts";
import { Button, Text } from "@/components/ui";
import { characterDisplayName, type Character } from "@/lib/domain/character";
import type { RosterEntry } from "@/lib/domain/run";
import type { TrolleySummary } from "@/lib/domain/summary";
import { countNote, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The two answers, pinned to the theme's comparison pair. */
const SERIES: HistogramSeriesSpec[] = [
  { id: "track1", label: "Track 1", color: "track1" },
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
  const groups = useMemo((): HistogramGroupSpec[] => {
    const perCharacter = summary?.perCharacter ?? {};
    // The roster is the order on screen; anything the summary knows about and the
    // roster does not (a character removed mid-run) is appended rather than lost.
    const ids = [
      ...roster.map((entry) => entry.characterId),
      ...Object.keys(perCharacter).filter(
        (id) => !roster.some((entry) => entry.characterId === id),
      ),
    ];

    return ids.map((id) => {
      const tally = perCharacter[id];
      const character = characters.get(id);
      return {
        id,
        label: character ? characterDisplayName(character) : id,
        values: { track1: tally?.track1 ?? 0, track2: tally?.track2 ?? 0 },
        weights: tally?.meanWeights,
        note: countNote(tally?.errors ?? 0, "error"),
        accessory: character ? (
          <Avatar shape={character.avatar.shape} color={character.avatar.color} size="sm" />
        ) : undefined,
      } satisfies HistogramGroupSpec;
    });
  }, [characters, roster, summary]);

  const answered = summary?.decisions.length ?? 0;

  return (
    <View className={cn("gap-lg", className)}>
      <Histogram
        series={SERIES}
        groups={groups}
        emptyMessage="No answers yet. Start a run and they will fill in here."
      />

      <View className="flex-row flex-wrap items-center gap-md">
        <Text variant="muted">
          {`${pluralize(answered, "decision")} recorded`}
        </Text>
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
