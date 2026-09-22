import { View } from "react-native";

import { Text } from "@/components/ui";
import type { RunStatus } from "@/lib/domain/run";
import type { LogLevel, SpanStatus } from "@/lib/domain/span";
import { cn } from "@/lib/utils";

import { LabelText } from "./field";

/**
 * A state, shown as a bullet and a word rather than a filled pill.
 *
 * Verdigris is settled, gilt is in motion, oxblood is a failure, and anything
 * nobody is waiting on stays in the muted ink. A pill claims to be a control;
 * these states are not actionable, so they read as metadata.
 */
function Dot({ tone, label }: { tone: string; label: string }) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      className={cn("h-sm w-sm rounded-full", tone)}
    />
  );
}

/* The bullet and, beside it, the state as a label — small caps in the display
   face, like the tabs and the section headings. Set in quiet body serif a state
   read as prose that had lost its sentence. */
function Mark({ dot, label }: { dot: string; label: string }) {
  return (
    <View className="flex-row items-center gap-xs">
      <Dot tone={dot} label={label} />
      <LabelText>{label}</LabelText>
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

/**
 * How a finished run went, given how many of its calls failed.
 *
 * A ledger where nine rows in ten read "finished" has spent a column saying
 * nothing, so the settled state is a bullet on its own. A run that finished with
 * failures is a different state, not a footnote on the same one, and it takes the
 * gilt bullet and says how many in the failure ink.
 */
export function FinishedMark({ failures }: { failures: number }) {
  if (failures === 0) return <Dot tone={RUN_STATUS_DOTS.finished} label="finished" />;

  return (
    <View className="flex-row items-center gap-xs">
      <Dot tone={RUN_STATUS_DOTS.running} label="finished with failures" />
      <Text variant="meta" className="text-destructive">{`${failures} failed`}</Text>
    </View>
  );
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
