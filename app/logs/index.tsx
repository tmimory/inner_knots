import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import {
  EMPTY_FILTERS,
  RunFiltersBar,
  RunRow,
  filterSummary,
  matchesSearch,
  type RunFilters,
} from "@/components/logs";
import { Screen } from "@/components/shell";
import { Text } from "@/components/ui";
import { LOGS_POLL_MS, useCharacterIndex, useRuns } from "@/lib/client/use-runs";
import type { Run } from "@/lib/domain/run";
import { dayKey, formatDay, pluralize } from "@/lib/format";

type DayGroup = { key: string; label: string; runs: Run[] };

/** Runs by the day they started, newest day first, newest run first inside it. */
function groupByDay(runs: readonly Run[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const run of runs) {
    const key = dayKey(run.startedAt);
    const group = groups.get(key) ?? { key, label: formatDay(run.startedAt), runs: [] };
    group.runs.push(run);
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) => right.key.localeCompare(left.key));
}

export default function LogsScreen() {
  const [filters, setFilters] = useState<RunFilters>(EMPTY_FILTERS);
  const characters = useCharacterIndex();

  // Puzzle, status and character narrow the query; the free text is a local
  // sieve, because a run id is not something the store indexes.
  const { runs, loading, error } = useRuns(
    {
      puzzle: filters.puzzle,
      status: filters.status,
      characterId: filters.characterId,
    },
    { pollMs: LOGS_POLL_MS },
  );

  const shown = useMemo(
    () => runs.filter((run) => matchesSearch(run.id, filters.search)),
    [runs, filters.search],
  );
  const groups = useMemo(() => groupByDay(shown), [shown]);
  const narrowed = filterSummary(filters);

  // A filter row over an empty ledger is dead UI: it only appears once there is
  // something to sift, or once the reader has already narrowed the query.
  const sifting = runs.length > 0 || narrowed !== undefined;

  return (
    <Screen
      title="Logs"
      subtitle="ὑπομνήματα"
      right={
        error ? (
          <Text variant="small" className="text-destructive">
            the ledger could not be read: {error}
          </Text>
        ) : loading && runs.length === 0 ? (
          <Text variant="meta">opening the ledger…</Text>
        ) : shown.length > 0 ? (
          <Text variant="meta">{pluralize(shown.length, "run")}</Text>
        ) : null
      }
    >
      {sifting ? (
        <RunFiltersBar filters={filters} characters={characters} onChange={setFilters} />
      ) : null}

      {groups.map((group) => (
        <View key={group.key} className="gap-sm">
          <Text variant="h3" className="text-lg">
            {group.label}
          </Text>
          <View>
            {group.runs.map((run) => (
              <RunRow key={run.id} run={run} characters={characters} />
            ))}
          </View>
        </View>
      ))}

      {groups.length === 0 && !loading ? (
        narrowed ? (
          <Text variant="lead">Nothing in the ledger answers to {narrowed}.</Text>
        ) : (
          <View className="gap-sm">
            <Text variant="lead">
              Nothing has been run yet. Every prompt and every answer will be copied out here.
            </Text>
            <Link href="/puzzles/trolley">
              <Text variant="small" className="text-primary underline">
                Run the trolley
              </Text>
            </Link>
          </View>
        )
      ) : null}
    </Screen>
  );
}
