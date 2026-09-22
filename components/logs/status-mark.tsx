import { View } from "react-native";

import type { RunStatus } from "@/lib/domain/run";
import type { LogLevel, SpanStatus } from "@/lib/domain/span";
import { cn } from "@/lib/utils";

import { LabelText } from "./field";

/**
 * A state, shown as a bullet and a word rather than a filled pill.
 *
 * Moss is settled, verdigris is in motion, gilt is a run that did not get there,
 * and anything nobody is waiting on stays in the muted ink. A pill claims to be a
 * control; these states are not actionable, so they read as metadata.
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

/**
 * The bullet each run state is drawn with.
 *
 * Moss for a run that got there — a status colour of its own, rather than the
 * verdigris the app uses for a secondary action — and gilt for the two ways a run
 * stops short of its last decision. The two are far enough apart in hue *and* in
 * value that the column reads at a glance and still reads in grey.
 */
const RUN_STATUS_DOTS: Record<RunStatus, string> = {
  queued: "bg-muted-foreground",
  running: "bg-secondary",
  finished: "bg-success",
  failed: "bg-accent",
  cancelled: "bg-accent",
};

/**
 * What each state is called, in one grammar.
 *
 * Every row says a word. A column where nine lines in ten are a bare bullet and
 * the tenth is a bullet and an adjective makes the reader learn the colour key
 * before they can read the ledger; four words in one weight and one case make the
 * column scannable and leave the colour as confirmation rather than as the whole
 * message. "done" rather than "finished", because it is the shortest true word
 * and it sits at the same length as the states it is read against.
 */
const RUN_STATUS_WORDS: Record<RunStatus, string> = {
  queued: "queued",
  running: "running",
  finished: "done",
  failed: "failed",
  cancelled: "cancelled",
};

/** How a run is going, for the ledger and the run header. */
export function StatusMark({ status }: { status: RunStatus }) {
  return <Mark dot={RUN_STATUS_DOTS[status]} label={RUN_STATUS_WORDS[status]} />;
}

/**
 * How a finished run went, given how many of its calls failed.
 *
 * The same word as every other settled run — the run did finish — with the gilt
 * bullet of a run that did not come through clean. How many calls failed is a
 * fact about the result, so it is said in the result column beside the summary,
 * not spelled into the state.
 */
export function FinishedMark({ failures }: { failures: number }) {
  return (
    <Mark
      dot={failures === 0 ? RUN_STATUS_DOTS.finished : RUN_STATUS_DOTS.failed}
      label={RUN_STATUS_WORDS.finished}
    />
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
