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
import { EmptyState, SectionHeading, Text } from "@/components/ui";
import { LOGS_POLL_MS, useCharacterIndex, useRuns } from "@/lib/client/use-runs";
import type { Run } from "@/lib/domain/run";
import { dayKey, formatDay, pluralize } from "@/lib/format";

type DayGroup = { key: string; label: string; runs: Run[] };

/** Runs by the day they started, newest day first, newest run first inside it. */
function groupByDay(runs: readonly Run[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const run of runs) {
    const key = dayKey(run.startedAt);
    const group = groups.get(key) ?? {
      key,
      label: formatDay(run.startedAt),
      runs: [],
    };
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

  // The subtitle carries a fact about the ledger rather than a slogan about it:
  // "every prompt, every answer" is true of every screenshot ever taken of this
  // page, which is another way of saying it told the reader nothing.
  const puzzles = new Set(shown.map((run) => run.puzzle)).size;
  const ledger =
    shown.length === 0
      ? "ὑπομνήματα"
      : `ὑπομνήματα — ${pluralize(shown.length, "run")} · ${pluralize(puzzles, "puzzle")}`;

  // A filter row over an empty ledger is dead UI: it only appears once there is
  // something to sift, or once the reader has already narrowed the query.
  const sifting = runs.length > 0 || narrowed !== undefined;

  return (
    <Screen
      title="Logs"
      subtitle={ledger}
      right={
        error ? (
          <Text variant="small" className="text-destructive">
            the ledger could not be read: {error}
          </Text>
        ) : loading && runs.length === 0 ? (
          <Text variant="meta">opening the ledger…</Text>
        ) : null
      }
    >
      {sifting ? (
        <RunFiltersBar filters={filters} characters={characters} onChange={setFilters} />
      ) : null}

      {/* No count on the rule: the subtitle already says how many runs the ledger
          is showing, and saying it twice on one screen — once in Greek, once in
          the margin of the first day — is the page arguing with itself. */}
      {groups.map((group) => (
        <View key={group.key} className="gap-sm">
          <SectionHeading title={group.label} />
          <View className="border-t-hairline border-border">
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
          // The one screen in the app with nothing of its own to show until
          // something has been run, so it stops apologising and becomes the
          // launchpad: one way in, set as the primary, and the others beside it.
          <EmptyState
            title="No runs yet"
            body="Every prompt sent to a model and every answer it gave is copied out here, run by run. Start one and the ledger fills itself."
            action={{ label: "Run a trolley problem", href: "/puzzles/trolley" }}
            links={[
              { label: "Prisoner's dilemma", href: "/puzzles/prisoners-dilemma" },
              { label: "Adventure", href: "/puzzles/adventure" },
            ]}
          />
        )
      ) : null}
    </Screen>
  );
}
