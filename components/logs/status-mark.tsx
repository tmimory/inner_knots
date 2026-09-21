import { View } from "react-native";

import { Text } from "@/components/ui";
import type { RunStatus } from "@/lib/domain/run";
import type { LogLevel, SpanStatus } from "@/lib/domain/span";
import { cn } from "@/lib/utils";

/**
 * A state, shown as a bullet and a word rather than a filled pill.
 *
 * Verdigris is settled, gilt is in motion, oxblood is a failure, and anything
 * nobody is waiting on stays in the muted ink. A pill claims to be a control;
 * these states are not actionable, so they read as metadata.
 */
function Mark({ dot, label }: { dot: string; label: string }) {
  return (
    <View className="flex-row items-center gap-xs">
      <View
        accessibilityRole="image"
        accessibilityLabel={label}
        className={cn("h-sm w-sm rounded-full", dot)}
      />
      <Text variant="meta">{label}</Text>
    </View>
  );
}

const RUN_STATUS_DOTS: Record<RunStatus, string> = {
  queued: "bg-muted-foreground",
  running: "bg-accent",
  finished: "bg-secondary",
  failed: "bg-destructive",
  cancelled: "bg-border",
};

/** How a run is going, for the ledger and the run header. */
export function StatusMark({ status }: { status: RunStatus }) {
  return <Mark dot={RUN_STATUS_DOTS[status]} label={status} />;
}

const LOG_LEVEL_DOTS: Record<LogLevel, string> = {
  debug: "bg-border",
  info: "bg-muted-foreground",
  warn: "bg-accent",
  error: "bg-destructive",
};

/** How loud one log line is. */
export function LevelMark({ level }: { level: LogLevel }) {
  return <Mark dot={LOG_LEVEL_DOTS[level]} label={level} />;
}

const SPAN_STATUS_DOTS: Record<SpanStatus, string> = {
  ok: "bg-secondary",
  error: "bg-destructive",
  running: "bg-accent",
};

/** A span's state in the width of a bullet, for a dense tree row. */
export function StatusDot({ status, className }: { status: SpanStatus; className?: string }) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={status}
      className={cn("h-sm w-sm rounded-full", SPAN_STATUS_DOTS[status], className)}
    />
  );
}
