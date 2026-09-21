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
import { PageHeader, Scroll } from "@/components/shell";
import { Badge, Text } from "@/components/ui";
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

  return (
    <View className="gap-xl">
      <PageHeader
        title="Logs"
        subtitle="ὑπομνήματα · every prompt, every answer"
        right={
          <Badge variant={error ? "destructive" : "muted"}>
            <Text>
              {error
                ? `the ledger could not be read: ${error}`
                : loading && runs.length === 0
                  ? "opening the ledger…"
                  : pluralize(shown.length, "run")}
            </Text>
          </Badge>
        }
      />

      <Scroll>
        <RunFiltersBar filters={filters} characters={characters} onChange={setFilters} />
      </Scroll>

      {groups.map((group) => (
        <View key={group.key} className="gap-md">
          <Text variant="h3" className="text-lg">
            {group.label}
          </Text>
          <View className="gap-sm">
            {group.runs.map((run) => (
              <RunRow key={run.id} run={run} characters={characters} />
            ))}
          </View>
        </View>
      ))}

      {groups.length === 0 && !loading ? (
        <Scroll>
          <Text variant="lead">
            {narrowed
              ? `Nothing in the ledger answers to ${narrowed}.`
              : "The ledger is blank. Set a puzzle going and every prompt, every answer and every span it produces will be copied out here."}
          </Text>
        </Scroll>
      ) : null}
    </View>
  );
}
