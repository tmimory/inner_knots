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
import { formatPercent, pluralize } from "@/lib/format";

import { JsonTree } from "./json-tree";
import { CharacterFace, nameOf } from "./roster-avatars";

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
 */
export function summaryLine(run: Run): string | undefined {
  const summary = parseRunSummary(run.summary);
  if (!summary) return undefined;

  switch (summary.kind) {
    case "trolley": {
      const totals = trolleyTotals(summary);
      const failed = totals.errors > 0 ? ` · ${totals.errors} failed` : "";
      return `Track 1 ×${totals.track1} · Track 2 ×${totals.track2}${failed}`;
    }
    case "prisoners-dilemma": {
      const { a, b } = summary.perPlayer;
      return `A testified ${testifyRatio(a)}, B ${testifyRatio(b)}`;
    }
    case "adventure": {
      const paths = summary.paths.length;
      const endings = endingsOf(summary);
      return `${pluralize(paths, "path")}, ${pluralize(endings, "ending")}`;
    }
  }
}

// --- table -------------------------------------------------------------------------

type TableRow = { key: string; label: ReactNode; values: string[] };

/** A label column and a set of right-aligned numeric columns. */
function Table({ headers, rows }: { headers: string[]; rows: TableRow[] }) {
  const [first, ...rest] = headers;
  return (
    <View className="gap-xs">
      <View className="flex-row items-center gap-sm border-b-hairline border-border pb-xs">
        <Text variant="muted" className="flex-1 text-xs">
          {first}
        </Text>
        {rest.map((header) => (
          <Text key={header} variant="muted" className="w-4xl text-right text-xs">
            {header}
          </Text>
        ))}
      </View>
      {rows.map((row) => (
        <View key={row.key} className="flex-row items-center gap-sm py-xs">
          <View className="flex-1">{row.label}</View>
          {row.values.map((value, index) => (
            <Text key={`${row.key}-${index}`} variant="small" className="w-4xl text-right font-mono text-xs">
              {value}
            </Text>
          ))}
        </View>
      ))}
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
      <Text variant="small">{nameOf(characterId, characters)}</Text>
    </View>
  );
}

function TextLabel({ text }: { text: string }) {
  return <Text variant="small">{text}</Text>;
}

/** A mean weight as a percentage, or a dash when no call reported one. */
function meanCell(mean: number | undefined): string {
  return mean === undefined ? "—" : formatPercent(mean, 0);
}

// --- per-puzzle tables -------------------------------------------------------------

function TrolleySummaryTable({
  summary,
  characters,
}: {
  summary: TrolleySummary;
  characters: ReadonlyMap<string, Character>;
}) {
  const rows: TableRow[] = Object.entries(summary.perCharacter).map(([characterId, tally]) => ({
    key: characterId,
    label: <CharacterLabel characterId={characterId} characters={characters} />,
    values: [
      String(tally.track1),
      String(tally.track2),
      String(tally.errors),
      meanCell(tally.meanWeights?.track1),
      meanCell(tally.meanWeights?.track2),
    ],
  }));

  return <Table headers={["Character", "Track 1", "Track 2", "Errors", "μ T1", "μ T2"]} rows={rows} />;
}

function PrisonersDilemmaSummaryTable({
  summary,
  config,
  characters,
}: {
  summary: PrisonersDilemmaSummary;
  config: { playerA: string; playerB: string };
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
      <Table headers={["Player", "Testify", "Silent", "Errors", "μ testify"]} rows={playerRows} />
      <Table headers={["Outcome", "Rounds"]} rows={outcomeRows} />
    </View>
  );
}

function AdventureSummaryTable({
  summary,
  characters,
}: {
  summary: AdventureSummary;
  characters: ReadonlyMap<string, Character>;
}) {
  const characterRows: TableRow[] = Object.entries(summary.perCharacter).map(([characterId, tally]) => ({
    key: characterId,
    label: <CharacterLabel characterId={characterId} characters={characters} />,
    values: [String(tally.completed), String(tally.errors)],
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
      <Table headers={["Character", "Completed", "Errors"]} rows={characterRows} />
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
 */
export function SummaryView({ run, characters }: SummaryViewProps) {
  if (run.summary === undefined || run.summary === null) {
    return <Text variant="muted">No summary yet. One is written after the first decision.</Text>;
  }

  const summary = parseRunSummary(run.summary);
  if (!summary) return <JsonTree value={run.summary} label="summary" openDepth={1} />;

  switch (summary.kind) {
    case "trolley":
      return <TrolleySummaryTable summary={summary} characters={characters} />;
    case "prisoners-dilemma":
      return (
        <PrisonersDilemmaSummaryTable
          summary={summary}
          config={
            run.config.puzzle === "prisoners-dilemma"
              ? run.config
              : { playerA: "A", playerB: "B" }
          }
          characters={characters}
        />
      );
    case "adventure":
      return <AdventureSummaryTable summary={summary} characters={characters} />;
  }
}
