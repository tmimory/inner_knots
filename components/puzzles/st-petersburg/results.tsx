import { useMemo, type ReactNode } from "react";
import { ScrollView, View } from "react-native";

import { Histogram, type HistogramGroupSpec, type HistogramSeriesSpec } from "@/components/charts";
import { ResultsFooter } from "@/components/puzzles/results-footer";
import { rosterGroups } from "@/components/puzzles/roster-groups";
import { Label, Text } from "@/components/ui";
import type { Character } from "@/lib/domain/character";
import type { RosterEntry } from "@/lib/domain/run";
import type { StPetersburgCharacterTally, StPetersburgSummary } from "@/lib/domain/summary";
import { UNKNOWN, countNote, pluralize } from "@/lib/format";
import { showsFlipGrid } from "@/lib/puzzles/st-petersburg/ui-helpers";
import { cn } from "@/lib/utils";

import { FlipGrid } from "./flip-grid";

/** The two answers, pinned to the theme's comparison pair, everywhere on the screen. */
const SERIES: HistogramSeriesSpec[] = [
  { id: "flip", label: "Flipped", color: "primary" },
  { id: "walk", label: "Walked", color: "track2" },
];

const EMPTY_TALLY: StPetersburgCharacterTally = {
  flip: 0,
  walk: 0,
  errors: 0,
  heads: 0,
  tails: 0,
  endings: { walked: 0, face: 0, limit: 0, error: 0 },
};

/**
 * The columns of the endings table, in reading order.
 *
 * Header and value are derived from one list, so a column cannot mean one thing
 * in the heading and another in the row under it. The headings are short because
 * they sit over a number; the sentence each one is short for is the accessible
 * name of its cell.
 */
const ENDING_COLUMNS: readonly {
  id: string;
  header: string;
  said: string;
  value: (tally: StPetersburgCharacterTally) => string;
}[] = [
  {
    id: "walked",
    header: "Walked",
    said: "walked away",
    value: (tally) => String(tally.endings.walked),
  },
  {
    id: "face",
    header: "Coin",
    said: "ended by the coin",
    value: (tally) => String(tally.endings.face),
  },
  {
    id: "limit",
    header: "Limit",
    said: "hit the flip limit",
    value: (tally) => String(tally.endings.limit),
  },
  {
    id: "error",
    header: "Errors",
    said: "ended with no answer",
    value: (tally) => String(tally.endings.error),
  },
  {
    id: "mean",
    header: "μ flips",
    said: "mean flips per finished game",
    value: (tally) =>
      tally.meanFlipsPerGame === undefined ? UNKNOWN : tally.meanFlipsPerGame.toFixed(1),
  },
];

export type StPetersburgResultsProps = {
  /** The summary as it stands; the engine rewrites it after every turn. */
  summary: StPetersburgSummary | undefined;
  /** The roster, so a character that has not played yet still gets a row. */
  roster: readonly RosterEntry[];
  characters: ReadonlyMap<string, Character>;
  /** Turns a full game may run to, so the grid has its columns before they are played. */
  maxFlips: number;
  /** Links to the run's page in the logs, once there is a run. */
  runId?: string | null;
  className?: string;
};

/** One character's line of the endings table. */
function EndingRow({
  name,
  tally,
  accessory,
}: {
  name: string;
  tally: StPetersburgCharacterTally;
  accessory?: ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-xxs">
      <View className="w-tally flex-row items-center gap-sm">
        {accessory}
        <Text className="flex-1 font-display text-sm" numberOfLines={1}>
          {name}
        </Text>
      </View>
      {ENDING_COLUMNS.map((column) => (
        <Text
          key={column.id}
          variant="small"
          accessibilityLabel={`${name}, ${column.said}: ${column.value(tally)}`}
          className="w-4xl tabular text-right"
          numberOfLines={1}
        >
          {column.value(tally)}
        </Text>
      ))}
    </View>
  );
}

/**
 * How the roster played the coin: the counts, the endings, and the games themselves.
 *
 * The histogram's groups are the characters and its series are the two answers,
 * because the question the screen exists to answer is "does this one keep
 * flipping?" — and that reads off a pair of adjacent bars. But a character that
 * flips nine times out of ten and one that flips nine times in a row are the same
 * pair of bars and not the same gambler, which is what the endings table and the
 * grid underneath it are for: one says how the games stopped, the other says when.
 */
export function StPetersburgResults({
  summary,
  roster,
  characters,
  maxFlips,
  runId,
  className,
}: StPetersburgResultsProps) {
  /**
   * The roster is the order on screen; anything the summary knows about and the
   * roster does not (a character removed mid-run) is appended rather than lost.
   */
  const rows = useMemo(
    () =>
      rosterGroups(roster, summary?.perCharacter ?? {}, characters).map((group) => ({
        ...group,
        tally: group.tally ?? EMPTY_TALLY,
      })),
    [characters, roster, summary],
  );

  const groups = useMemo(
    (): HistogramGroupSpec[] =>
      rows.map(
        (row) =>
          ({
            id: row.id,
            label: row.name,
            values: { flip: row.tally.flip, walk: row.tally.walk },
            weights: row.tally.meanWeights,
            note: countNote(row.tally.errors, "error"),
            accessory: row.accessory,
          }) satisfies HistogramGroupSpec,
      ),
    [rows],
  );

  const games = summary?.games.length ?? 0;
  const flips = summary?.games.reduce((sum, game) => sum + game.flips.length, 0) ?? 0;

  // Nothing is worth drawing before a turn has come back — and the screen does
  // not head a section that has nothing under it, so there is not even a sentence
  // to write here: the whole block stays away until the first answer lands.
  if (summary === undefined || flips === 0) return null;

  return (
    <View className={cn("gap-lg", className)}>
      <Histogram series={SERIES} groups={groups} />

      {/* How the games stopped. Five narrow columns of figures want a scroll of
          their own on a phone rather than a name column squeezed to nothing. */}
      <View className="gap-sm">
        <Label>How the games ended</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="gap-xxs">
          <View className="gap-xxs">
            <View className="flex-row items-end gap-xxs">
              <View className="w-tally" />
              {ENDING_COLUMNS.map((column) => (
                <Text
                  key={column.id}
                  variant="meta"
                  className="w-4xl text-right"
                  numberOfLines={1}
                >
                  {column.header}
                </Text>
              ))}
            </View>
            {rows.map((row) => (
              <EndingRow
                key={row.id}
                name={row.name}
                tally={row.tally}
                accessory={row.accessory}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* One game of one flip is the histogram said twice; anything longer is a
          shape worth laying out as rows. */}
      {showsFlipGrid(games, maxFlips) ? (
        <View className="gap-sm">
          <Label>Flip by flip</Label>
          <FlipGrid games={summary.games} maxFlips={maxFlips} characters={characters} />
        </View>
      ) : null}

      <ResultsFooter
        note={`${pluralize(games, "game")} · ${pluralize(flips, "flip")} recorded`}
        runId={runId}
      />
    </View>
  );
}
