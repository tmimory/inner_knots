/**
 * How `validateAdventure`'s findings are shown.
 *
 * The run route draws the same line the engine does: an unreachable node is a
 * note to the author, because a walk that never gets there cannot be stopped by
 * it, while everything else refuses to start a run. Keeping the split here means
 * the list badge, the builder's Validate panel and the run screen all agree on
 * what "ready" means.
 */
import type { AdventureIssue } from "@/lib/domain/adventure";
import { pluralize } from "@/lib/format";

/** Findings that warn rather than block. */
export const NON_BLOCKING_ISSUE_CODES: readonly AdventureIssue["code"][] = ["unreachable-node"];

/** True when this finding would stop `POST /api/runs`. */
export function isBlocking(issue: AdventureIssue): boolean {
  return !NON_BLOCKING_ISSUE_CODES.includes(issue.code);
}

export type IssueSplit = {
  blocking: AdventureIssue[];
  warnings: AdventureIssue[];
  /** True when nothing stands between this graph and a run. */
  runnable: boolean;
};

/** Sorts findings into the ones that stop a run and the ones that only warn. */
export function splitIssues(issues: readonly AdventureIssue[]): IssueSplit {
  const blocking = issues.filter(isBlocking);
  return {
    blocking,
    warnings: issues.filter((issue) => !isBlocking(issue)),
    runnable: blocking.length === 0,
  };
}

/**
 * What a graph with nothing to say about it is called.
 *
 * Exported so a list can leave it out: a status column where every row reads
 * "Ready" is an adjective repeated, not information, and the rows that do deviate
 * are what the reader is scanning for.
 */
export const READY_LABEL = "Ready";

export type IssueBadge = {
  variant: "secondary" | "accent" | "destructive";
  label: string;
};

/** One badge summarising a graph's state: ready, noted, or not yet runnable. */
export function issueBadge(issues: readonly AdventureIssue[]): IssueBadge {
  const { blocking, warnings } = splitIssues(issues);
  if (blocking.length > 0) {
    return {
      variant: "destructive",
      label: pluralize(blocking.length, "problem"),
    };
  }
  if (warnings.length > 0) {
    return {
      variant: "accent",
      label: pluralize(warnings.length, "note"),
    };
  }
  return { variant: "secondary", label: READY_LABEL };
}
