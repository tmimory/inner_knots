import { useMemo, type ReactNode } from "react";
import { ScrollView, View } from "react-native";

import { Histogram, type HistogramGroupSpec, type HistogramSeriesSpec } from "@/components/charts";
import { ResultsFooter } from "@/components/puzzles/results-footer";
import { rosterGroups } from "@/components/puzzles/roster-groups";
import { Label, Text } from "@/components/ui";
import type { Character } from "@/lib/domain/character";
import type { RosterEntry } from "@/lib/domain/run";
import type { StPetersburgCharacterTally, StPetersburgSummary } from "@/lib/domain/summary";
import { UNKNOWN, countNote, formatMoney, pluralize } from "@/lib/format";
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
type EndingColumn = {
  id: string;
  header: string;
  said: string;
  value: (tally: StPetersburgCharacterTally) => string;
  /** How wide the cell is; counts all read in the one narrow column. */
  width?: string;
};

const ENDING_COLUMNS: readonly EndingColumn[] = [
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

/**
 * What one game was worth on average, for a coin that pays money.
 *
 * Only drawn when the run is priced — over a coin paid in prose there is no
 * pot to average, and a column of dashes says nothing the other five do not.
 * Wider than the counts beside it: a stake that doubles turns four figures into
 * seven within a few flips, and money that has been truncated is worse than
 * money that takes a little more room.
 */
const MEAN_WINNINGS_COLUMN: EndingColumn = {
  id: "winnings",
  header: "μ won",
  said: "mean winnings per game",
  value: (tally) => (tally.meanWinnings === undefined ? UNKNOWN : formatMoney(tally.meanWinnings)),
  width: "w-seat",
};

/** The default width of a figure column, when the column does not ask for its own. */
const COLUMN_WIDTH = "w-4xl";

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
  columns,
  accessory,
}: {
  name: string;
  tally: StPetersburgCharacterTally;
  columns: readonly EndingColumn[];
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
      {columns.map((column) => (
        <Text
          key={column.id}
          variant="small"
          accessibilityLabel={`${name}, ${column.said}: ${column.value(tally)}`}
          className={cn("tabular text-right", column.width ?? COLUMN_WIDTH)}
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

  /**
   * The money column joins the table only once there is money to put in it: a
   * coin paid in prose has no pot, and the engine leaves `meanWinnings` off.
   */
  const columns = useMemo(
    (): readonly EndingColumn[] =>
      rows.some((row) => row.tally.meanWinnings !== undefined)
        ? [...ENDING_COLUMNS, MEAN_WINNINGS_COLUMN]
        : ENDING_COLUMNS,
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

      {/* How the games stopped. A row of narrow figure columns wants a scroll of
          its own on a phone rather than a name column squeezed to nothing. */}
      <View className="gap-sm">
        <Label>How the games ended</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="gap-xxs">
          <View className="gap-xxs">
            <View className="flex-row items-end gap-xxs">
              <View className="w-tally" />
              {columns.map((column) => (
                <Text
                  key={column.id}
                  variant="meta"
                  className={cn("text-right", column.width ?? COLUMN_WIDTH)}
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
                columns={columns}
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
          <FlipGrid
            games={summary.games}
            maxFlips={maxFlips}
            characters={characters}
            order={rows.map((row) => row.id)}
          />
        </View>
      ) : null}

      <ResultsFooter
        note={`${pluralize(games, "game")} · ${pluralize(flips, "turn")} recorded`}
        runId={runId}
      />
    </View>
  );
}
