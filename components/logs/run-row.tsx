import { Link } from "expo-router";
import { Pressable, View } from "react-native";

import { Badge, Progress, Text } from "@/components/ui";
import type { Character } from "@/lib/domain/character";
import type { Run } from "@/lib/domain/run";
import { formatElapsed, formatTime, truncate } from "@/lib/format";

import { RosterAvatars } from "./roster-avatars";
import { StatusBadge } from "./status-badge";
import { summaryLine } from "./summary-view";

/** How much of a run id a row shows; the rest is on the detail page. */
const ID_CHARS = 14;

/** How much of a failure a row quotes before the reader has to open the run. */
const ERROR_CHARS = 80;

/** A run's own words about what it is doing, when it has no summary yet. */
function progressText(run: Run): string {
  return `${run.progress.done} / ${run.progress.total}`;
}

export type RunRowProps = {
  run: Run;
  characters: ReadonlyMap<string, Character>;
};

/** One line of the run index: who ran what, when, how it went, and what came out. */
export function RunRow({ run, characters }: RunRowProps) {
  const summary = summaryLine(run);
  const running = run.status === "running" || run.status === "queued";

  return (
    <Link href={{ pathname: "/logs/[id]", params: { id: run.id } }} asChild>
      <Pressable
        role="link"
        className="gap-sm rounded-lg border-hairline border-border bg-card p-lg transition-colors duration-fast web:hover:border-ring"
      >
        <View className="flex-row flex-wrap items-center gap-sm">
          <Badge variant="outline">
            <Text>{run.puzzle}</Text>
          </Badge>
          <RosterAvatars config={run.config} characters={characters} />
          <View className="flex-1" />
          <Text variant="muted" className="font-mono text-xs">
            {progressText(run)}
          </Text>
          <StatusBadge status={run.status} />
        </View>

        {running ? (
          <Progress
            value={run.progress.done}
            max={Math.max(1, run.progress.total)}
            indicatorClassName="bg-accent"
          />
        ) : null}

        <View className="flex-row flex-wrap items-center gap-sm">
          <Text variant="muted" className="font-mono text-xs">
            {truncate(run.id, ID_CHARS)}
          </Text>
          <Text variant="muted" className="text-xs">
            {formatTime(run.startedAt)} · {formatElapsed(run.startedAt, run.finishedAt)}
          </Text>
          {summary ? <Text variant="small">{summary}</Text> : null}
          {run.error ? (
            <Text variant="small" className="text-destructive">
              {truncate(run.error, ERROR_CHARS)}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}
