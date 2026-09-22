import { Link } from "expo-router";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui";
import type { Character } from "@/lib/domain/character";
import type { Run } from "@/lib/domain/run";
import { UNKNOWN } from "@/lib/format";
import { cn } from "@/lib/utils";

import { PUZZLE_LABELS } from "./labels";
import { RosterAvatars } from "./roster-avatars";
import { FinishedMark, StatusMark } from "./status-mark";
import { runFailures, summaryLine } from "./summary-view";

/**
 * How much of a run id a row shows: eight characters of the hash, no ellipsis.
 *
 * The `run_` prefix is the same on every line — a column of it says nothing — and
 * a trailing ellipsis after a truncated hash only says "there is more", which the
 * reader already knows. Eight characters is what it takes to tell a day's runs
 * apart, and every row is exactly that wide, so the column has an edge.
 */
const ID_CHARS = 8;

/** The distinguishing part of a run id, at a fixed width. */
export function shortRunId(id: string): string {
  return id.replace(/^run_/, "").slice(0, ID_CHARS).padEnd(ID_CHARS, " ");
}

/**
 * The clock time a run started, `14:32`.
 *
 * A day's runs are already under the day's own heading, so the date is said once
 * at the top and each row only has to say when within that day. "3h ago" on every
 * line of a list made ten rows read as ten identical answers to a question nobody
 * asked twice.
 */
function clockTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return UNKNOWN;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * The fixed measures of the two right-hand columns.
 *
 * Each is the same width whatever it contains, so the progress counts of ten rows
 * stack into a column and the states line up beside them instead of drifting with
 * the length of the word. The status column is the wider of the two because it
 * has to hold "cancelled" in small caps without shouldering into the numerals.
 */
const COUNT_COLUMN = "w-4xl";
const STATUS_COLUMN = "w-avatar-xl";

export type RunRowProps = {
  run: Run;
  characters: ReadonlyMap<string, Character>;
};

/**
 * One line of the run index: who ran what, when, how it went, and what came out.
 *
 * One line, not two. The row used to stack a title line over a metadata line and
 * leave the right half of both empty, which turned ten runs into twenty rows of
 * mostly parchment. Everything now sits on one baseline at one height — name,
 * faces, id, result on the left; clock, progress and state right-aligned into
 * fixed columns — so a day of the ledger scans down four straight edges.
 */
export function RunRow({ run, characters }: RunRowProps) {
  const failures = runFailures(run);
  const summary = summaryLine(run);

  return (
    <Link href={{ pathname: "/logs/[id]", params: { id: run.id } }} asChild>
      <Pressable
        role="link"
        className="h-control-lg flex-row items-center gap-sm border-b-hairline border-border transition-colors duration-fast active:bg-muted web:hover:bg-muted"
      >
        <Text className="font-bodyMedium text-base">{PUZZLE_LABELS[run.puzzle]}</Text>
        <RosterAvatars config={run.config} characters={characters} dense />

        {/* One size for everything secondary on the line: the id, what came out,
            and the clock. Three sizes within a hundred pixels of each other read
            as a layout that could not decide. */}
        <Text variant="meta" className="font-mono tabular">
          {shortRunId(run.id)}
        </Text>

        <Text variant="meta" className="flex-1" numberOfLines={1}>
          {run.error ?? summary ?? ""}
        </Text>

        <Text variant="meta">{clockTime(run.startedAt)}</Text>
        <Text variant="data" className={cn(COUNT_COLUMN, "text-right")}>
          {`${run.progress.done} / ${run.progress.total}`}
        </Text>
        <View className={cn(STATUS_COLUMN, "flex-row items-center justify-end")}>
          {/* Only a state worth noticing is a word: a settled run is a bullet. */}
          {run.status === "finished" ? (
            <FinishedMark failures={failures} />
          ) : (
            <StatusMark status={run.status} />
          )}
        </View>
      </Pressable>
    </Link>
  );
}
