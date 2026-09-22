import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui";
import type { Character } from "@/lib/domain/character";
import type { Run } from "@/lib/domain/run";
import {
  parseRunSummary,
  type AdventureSummary,
  type PrisonersDilemmaSummary,
  type TrolleySummary,
} from "@/lib/domain/summary";
import { UNKNOWN, formatPercent, pluralize } from "@/lib/format";

import { LabelText } from "./field";
import { JsonTree } from "./json-tree";
import { CharacterFace, nameOf, rosterOf } from "./roster-avatars";

/** How many of the most-visited adventure nodes a summary lists. */
const TOP_NODES = 8;

// --- one-line summaries ------------------------------------------------------------

function trolleyTotals(summary: TrolleySummary): { track1: number; track2: number; errors: number } {
  let track1 = 0;
  let track2 = 0;
  let errors = 0;
  for (const tally of Object.values(summary.perCharacter)) {
    track1 += tally.track1;
    track2 += tally.track2;
    errors += tally.errors;
  }
  return { track1, track2, errors };
}

/** `6/10` — how often a player testified out of the rounds they were asked. */
function testifyRatio(tally: { testify: number; silent: number; errors: number }): string {
  return `${tally.testify}/${tally.testify + tally.silent + tally.errors}`;
}

/** Distinct endings: the final option of every walk that reached one. */
function endingsOf(summary: AdventureSummary): number {
  const endings = new Set<string>();
  for (const path of summary.paths) {
    if (!path.terminal) continue;
    const last = path.steps[path.steps.length - 1];
    if (last) endings.add(`${last.nodeId}:${last.optionId ?? ""}`);
  }
  return endings.size;
}

/**
 * A run's result in one line, for a list row: what the puzzle actually produced,
 * not how far along it is.
 *
 * One separator throughout — the middle dot — because a list that joins two
 * clauses with a comma on one row and a dot on the next reads as two lists. How
 * many calls failed is not part of the result, so it is left to
 * {@link runFailures} and the row's status column.
 */
export function summaryLine(run: Run): string | undefined {
  const summary = parseRunSummary(run.summary);
  if (!summary) return undefined;

  switch (summary.kind) {
    case "trolley": {
      const totals = trolleyTotals(summary);
      return `Track 1 ×${totals.track1} · Track 2 ×${totals.track2}`;
    }
    case "prisoners-dilemma": {
      const { a, b } = summary.perPlayer;
      return `A testified ${testifyRatio(a)} · B ${testifyRatio(b)}`;
    }
    case "adventure": {
      const paths = summary.paths.length;
      const endings = endingsOf(summary);
      return `${pluralize(paths, "path")} · ${pluralize(endings, "ending")}`;
    }
  }
}

/**
 * How many of a run's calls came back as failures.
 *
 * A finished run with failures is not the same state as a finished run, and the
 * difference belongs in the status column rather than buried at the end of a
 * summary sentence.
 */
export function runFailures(run: Run): number {
  const summary = parseRunSummary(run.summary);
  if (!summary) return 0;

  switch (summary.kind) {
    case "trolley":
      return trolleyTotals(summary).errors;
    case "prisoners-dilemma":
      return summary.perPlayer.a.errors + summary.perPlayer.b.errors;
    case "adventure":
      return Object.values(summary.perCharacter).reduce((total, tally) => total + tally.errors, 0);
  }
}

// --- table -------------------------------------------------------------------------

type TableRow = { key: string; label: ReactNode; values: string[] };

/** The measure of one numeric column. Fixed, so every column has an edge. */
const NUMBER_COLUMN = "w-4xl text-right";

/**
 * Drops any column whose every cell is a dash.
 *
 * A run whose provider never reported weights showed two columns of em dashes, at
 * the same width and with the same headers as the columns that had numbers in
 * them — the table said "here are five measurements" and meant three. A column
 * with nothing in it is not a column, so it is not drawn, and what was left out
 * is said once under the table rather than fifteen times inside it.
 */
function withoutEmptyColumns(
  headers: string[],
  rows: TableRow[],
): { headers: string[]; rows: TableRow[]; omitted: string[] } {
  const [first, ...rest] = headers;
  const keep = rest
    .map((header, index) => ({ header, index }))
    .filter(({ index }) => rows.length === 0 || rows.some((row) => row.values[index] !== UNKNOWN));
  const omitted = rest.filter((header) => !keep.some((column) => column.header === header));

  return {
    headers: [first ?? "", ...keep.map((column) => column.header)],
    rows: rows.map((row) => ({ ...row, values: keep.map((column) => row.values[column.index] ?? UNKNOWN) })),
    omitted,
  };
}

/** A label column and a set of right-aligned numeric columns. */
function Table({ headers, rows }: { headers: string[]; rows: TableRow[] }) {
  const table = withoutEmptyColumns(headers, rows);
  const [first, ...rest] = table.headers;

  return (
    <View className="gap-xs">
      <View className="flex-row items-center gap-sm border-b-hairline border-border pb-xs">
        <LabelText className="flex-1">{first}</LabelText>
        {rest.map((header) => (
          <LabelText key={header} className={NUMBER_COLUMN}>
            {header}
          </LabelText>
        ))}
      </View>
      {table.rows.map((row) => (
        <View key={row.key} className="flex-row items-center gap-sm py-xs">
          <View className="flex-1">{row.label}</View>
          {row.values.map((value, index) => (
            <Text key={`${row.key}-${index}`} variant="data" className={NUMBER_COLUMN}>
              {value}
            </Text>
          ))}
        </View>
      ))}
      {table.omitted.length > 0 ? (
        <Text variant="meta">{`${table.omitted.join(" and ")}: not reported by this run's provider.`}</Text>
      ) : null}
    </View>
  );
}

function CharacterLabel({
  characterId,
  characters,
}: {
  characterId: string;
  characters: ReadonlyMap<string, Character>;
}) {
  return (
    <View className="flex-row items-center gap-sm">
      <CharacterFace character={characters.get(characterId)} size="sm" />
      <Text>{nameOf(characterId, characters)}</Text>
    </View>
  );
}

function TextLabel({ text }: { text: string }) {
  return <Text variant="small">{text}</Text>;
}

/** A mean weight as a percentage, or a dash when no call reported one. */
function meanCell(mean: number | undefined): string {
  return mean === undefined ? UNKNOWN : formatPercent(mean, 0);
}

/** How many walks or games each character was asked for, by character id. */
function runsByCharacter(config: Run["config"]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const seat of rosterOf(config)) {
    counts.set(seat.characterId, (counts.get(seat.characterId) ?? 0) + seat.runs);
  }
  return counts;
}

// --- per-puzzle tables -------------------------------------------------------------

function TrolleySummaryTable({
  summary,
  runs,
  characters,
}: {
  summary: TrolleySummary;
  runs: ReadonlyMap<string, number>;
  characters: ReadonlyMap<string, Character>;
}) {
  const rows: TableRow[] = Object.entries(summary.perCharacter).map(([characterId, tally]) => ({
    key: characterId,
    label: <CharacterLabel characterId={characterId} characters={characters} />,
    values: [
      String(runs.get(characterId) ?? UNKNOWN),
      String(tally.track1),
      String(tally.track2),
      String(tally.errors),
      meanCell(tally.meanWeights?.track1),
      meanCell(tally.meanWeights?.track2),
    ],
  }));

  return (
    <Table
      headers={["Character", "Runs", "Track 1", "Track 2", "Errors", "μ T1", "μ T2"]}
      rows={rows}
    />
  );
}

function PrisonersDilemmaSummaryTable({
  summary,
  config,
  runs,
  characters,
}: {
  summary: PrisonersDilemmaSummary;
  config: { playerA: string; playerB: string };
  runs: ReadonlyMap<string, number>;
  characters: ReadonlyMap<string, Character>;
}) {
  const players: [string, string, PrisonersDilemmaSummary["perPlayer"]["a"]][] = [
    ["A", config.playerA, summary.perPlayer.a],
    ["B", config.playerB, summary.perPlayer.b],
  ];

  const playerRows: TableRow[] = players.map(([slot, characterId, tally]) => ({
    key: slot,
    label: (
      <View className="flex-row items-center gap-sm">
        <Text variant="small" className="font-display">
          {slot}
        </Text>
        <CharacterLabel characterId={characterId} characters={characters} />
      </View>
    ),
    values: [
      String(runs.get(characterId) ?? UNKNOWN),
      String(tally.testify),
      String(tally.silent),
      String(tally.errors),
      meanCell(tally.meanWeights?.testify),
    ],
  }));

  const outcomeRows: TableRow[] = (
    [
      ["Both testify", summary.outcomes.bothTestify],
      ["Both silent", summary.outcomes.bothSilent],
      ["Only A testifies", summary.outcomes.onlyATestifies],
      ["Only B testifies", summary.outcomes.onlyBTestifies],
      ["Incomplete", summary.outcomes.incomplete],
    ] as const
  ).map(([label, count]) => ({
    key: label,
    label: <TextLabel text={label} />,
    values: [String(count)],
  }));

  return (
    <View className="gap-lg">
      <Table
        headers={["Player", "Games", "Testify", "Silent", "Errors", "μ testify"]}
        rows={playerRows}
      />
      <Table headers={["Outcome", "Rounds"]} rows={outcomeRows} />
    </View>
  );
}

function AdventureSummaryTable({
  summary,
  runs,
  characters,
}: {
  summary: AdventureSummary;
  runs: ReadonlyMap<string, number>;
  characters: ReadonlyMap<string, Character>;
}) {
  const characterRows: TableRow[] = Object.entries(summary.perCharacter).map(([characterId, tally]) => ({
    key: characterId,
    label: <CharacterLabel characterId={characterId} characters={characters} />,
    values: [String(runs.get(characterId) ?? UNKNOWN), String(tally.completed), String(tally.errors)],
  }));

  const nodeRows: TableRow[] = Object.entries(summary.nodeHits)
    .sort((left, right) => right[1] - left[1])
    .slice(0, TOP_NODES)
    .map(([nodeId, hits]) => ({
      key: nodeId,
      label: <TextLabel text={nodeId} />,
      values: [String(hits)],
    }));

  return (
    <View className="gap-lg">
      <Table headers={["Character", "Walks", "Completed", "Errors"]} rows={characterRows} />
      <Table headers={["Node", "Visits"]} rows={nodeRows} />
    </View>
  );
}

// --- entry point -------------------------------------------------------------------

export type SummaryViewProps = {
  run: Run;
  characters: ReadonlyMap<string, Character>;
};

/**
 * The reducer's output as a table the reader can scan. A summary whose shape the
 * app does not recognize — an older run, a puzzle added since — is still shown,
 * as a JSON tree, rather than silently omitted.
 *
 * How many times each character was asked is a column of this table rather than a
 * separate roster block above it. The roster listed the same names, in a different
 * treatment, with their counts hung a thousand pixels away at the right edge of
 * the page — two tables of the same people, one of which was pretending not to be.
 */
export function SummaryView({ run, characters }: SummaryViewProps) {
  if (run.summary === undefined || run.summary === null) {
    return <Text variant="muted">No summary yet. One is written after the first decision.</Text>;
  }

  const summary = parseRunSummary(run.summary);
  if (!summary) return <JsonTree value={run.summary} label="summary" openDepth={1} />;
  const runs = runsByCharacter(run.config);

  switch (summary.kind) {
    case "trolley":
      return <TrolleySummaryTable summary={summary} runs={runs} characters={characters} />;
    case "prisoners-dilemma":
      return (
        <PrisonersDilemmaSummaryTable
          summary={summary}
          config={
            run.config.puzzle === "prisoners-dilemma"
              ? run.config
              : { playerA: "A", playerB: "B" }
          }
          runs={runs}
          characters={characters}
        />
      );
    case "adventure":
      return <AdventureSummaryTable summary={summary} runs={runs} characters={characters} />;
  }
}
