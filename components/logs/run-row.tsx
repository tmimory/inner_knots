import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui";
import type { Character } from "@/lib/domain/character";
import type { Run } from "@/lib/domain/run";
import { formatClock } from "@/lib/format";
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
 * The fixed measures of every column that is not the result.
 *
 * Each is the same width whatever it holds, so ten rows stack into columns rather
 * than into ten different indents. The puzzle's name and the faces beside it are
 * the two that used to breathe — "Adventure" is nine characters, "Prisoner's
 * dilemma" is nineteen, and a run has one face or three — and every column to
 * their right inherited the difference, which is why the ids never lined up
 * although each one is eight monospace characters wide.
 *
 * The status column is the widest: it has to hold "cancelled" in small caps
 * beside its bullet, and the bullet has to land on the same x on every line.
 */
const NAME_COLUMN = "w-seat";
const ROSTER_COLUMN = "w-avatar-xl";
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
  const [hovered, setHovered] = useState(false);
  const failures = runFailures(run);
  const summary = summaryLine(run);
  // What came out, and — when some of the calls did not — how many did not. The
  // state column says the run finished; the count of failures is a fact about
  // the result, so it rides the result.
  const result = [run.error ?? summary, failures > 0 ? `${failures} failed` : undefined]
    .filter((part): part is string => part !== undefined && part !== "")
    .join(" · ");

  return (
    <Link href={{ pathname: "/logs/[id]", params: { id: run.id } }} asChild>
      <Pressable
        role="link"
        className="h-control-lg flex-row items-center gap-sm border-b-hairline border-border transition-colors duration-fast active:bg-muted web:hover:bg-muted"
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
      >
        {/* The row is the target, so the row answers the cursor — a fill under the
            whole line and the puzzle's name in the rubric red, which is what every
            other link in the app does when you reach for it. */}
        <Text
          className={cn(
            NAME_COLUMN,
            "font-bodyMedium text-base transition-colors duration-fast",
            hovered ? "text-primary" : "text-foreground",
          )}
          numberOfLines={1}
        >
          {PUZZLE_LABELS[run.puzzle]}
        </Text>
        <View className={ROSTER_COLUMN}>
          <RosterAvatars config={run.config} characters={characters} dense />
        </View>

        {/* One size for everything secondary on the line: the id, what came out,
            and the clock. Three sizes within a hundred pixels of each other read
            as a layout that could not decide. */}
        <Text variant="meta" className="font-mono tabular">
          {shortRunId(run.id)}
        </Text>

        <Text variant="meta" className="flex-1" numberOfLines={1}>
          {result}
        </Text>

        <Text variant="meta">{formatClock(run.startedAt, { hour12: false })}</Text>
        <Text variant="data" className={cn(COUNT_COLUMN, "text-right")}>
          {`${run.progress.done} / ${run.progress.total}`}
        </Text>
        {/* Left-aligned inside a fixed column, so the bullet lands on one x down
            the whole ledger and the words start together beside it. */}
        <View className={cn(STATUS_COLUMN, "flex-row items-center")}>
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
