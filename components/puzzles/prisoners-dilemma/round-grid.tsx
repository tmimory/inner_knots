import { ScrollView, View } from "react-native";

import { Text } from "@/components/ui";
import type { PrisonersDilemmaChoice, PrisonersDilemmaGame } from "@/lib/domain/summary";
import { ROUND_GRID_GAME_LIMIT } from "@/lib/puzzles/prisoners-dilemma/ui-helpers";
import { cn } from "@/lib/utils";

export type RoundGridProps = {
  /** The games as they stand; the engine rewrites them after every decision. */
  games: readonly PrisonersDilemmaGame[];
  /** Rounds a full game runs to, so the columns exist before they are played. */
  rounds: number;
  names: { a: string; b: string };
  /** How many games to draw before deferring to the logs. */
  limit?: number;
  className?: string;
};

/** What a move looks like in a cell, and what a screen reader hears. */
function describe(choice: PrisonersDilemmaChoice | undefined): { glyph: string; said: string } {
  if (choice === "testify") return { glyph: "T", said: "testified" };
  if (choice === "silent") return { glyph: "S", said: "stayed silent" };
  return { glyph: "·", said: "no answer" };
}

/** One player's move: a letter in that player's series color, or a dot for silence. */
function Move({ choice, name }: { choice: PrisonersDilemmaChoice | undefined; name: string }) {
  const { glyph, said } = describe(choice);
  const tone =
    choice === "testify" ? "testify" : choice === "silent" ? "silent" : undefined;

  return (
    <View
      accessibilityLabel={`${name} ${said}`}
      className={cn(
        "h-xl w-xl items-center justify-center rounded-sm border-thick",
        tone === "testify" && "border-primary",
        tone === "silent" && "border-track2",
        tone === undefined && "border-border",
      )}
    >
      <Text
        className={cn(
          "font-mono text-xs",
          tone === "testify" && "text-primary",
          tone === "silent" && "text-track2",
          tone === undefined && "text-muted-foreground",
        )}
      >
        {glyph}
      </Text>
    </View>
  );
}

/**
 * One round of one game: both moves, with a betrayal marked on the cell.
 *
 * The outline is what carries the pattern at a glance — a run of plain cells is a
 * run of mutual silence, and the first hard outline is the round cooperation broke.
 */
function RoundCell({
  a,
  b,
  names,
}: {
  a: PrisonersDilemmaChoice | undefined;
  b: PrisonersDilemmaChoice | undefined;
  names: { a: string; b: string };
}) {
  const both = a === "testify" && b === "testify";
  const either = a === "testify" || b === "testify";

  return (
    <View
      className={cn(
        "w-4xl flex-row items-center justify-center gap-xxs rounded-sm border-hairline p-xxs",
        both ? "border-thick border-destructive" : either ? "border-destructive" : "border-border",
      )}
    >
      <Move choice={a} name={names.a} />
      <Move choice={b} name={names.b} />
    </View>
  );
}

/** An empty column: a round this game has not reached, or never will. */
function EmptyCell() {
  return <View className="w-4xl rounded-sm border-hairline border-dashed border-border p-xxs" />;
}

/**
 * Every game as a row of rounds, so a cooperation pattern is one glance rather
 * than a scroll through the logs.
 *
 * A single-round run is one column wide and is read down rather than across: the
 * twenty games of one bargain are twenty rows, and the column of round numbers
 * that names them all "1" is dropped. A game that ended early — a round that
 * never produced two answers ends its game — simply runs out of cells.
 */
export function RoundGrid({ games, rounds, names, limit = ROUND_GRID_GAME_LIMIT, className }: RoundGridProps) {
  const shown = games.slice(0, limit);
  const hidden = games.length - shown.length;
  const columns = Array.from({ length: Math.max(rounds, 1) }, (_, index) => index + 1);

  if (games.length === 0) {
    return (
      <Text variant="muted" className={className}>
        No rounds played yet.
      </Text>
    );
  }

  return (
    <View className={cn("gap-sm", className)}>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="gap-xxs">
        <View className="gap-xxs">
          {/* A row of round numbers over a single column is the number 1 said
              once for every game: the header arrives with the second round. */}
          {columns.length > 1 ? (
            <View className="flex-row items-end gap-xxs">
              <View className="w-avatar-xl" />
              {columns.map((round) => (
                <View key={round} className="w-4xl items-center">
                  <Text variant="muted" className="font-mono text-xs">
                    {round}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {shown.map((game) => (
            <View key={game.game} className="flex-row items-center gap-xxs">
              <View className="w-avatar-xl">
                <Text variant="muted" className="font-display text-xs" numberOfLines={1}>
                  {`Game ${game.game}`}
                </Text>
              </View>
              {columns.map((round) => {
                const played = game.rounds.find((entry) => entry.round === round);
                return played ? (
                  <RoundCell
                    key={round}
                    a={played.a.choice}
                    b={played.b.choice}
                    names={names}
                  />
                ) : (
                  <EmptyCell key={round} />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="flex-row flex-wrap items-center gap-md">
        <Text variant="muted">
          {`T testified · S stayed silent · · no answer — ${names.a} left, ${names.b} right`}
        </Text>
        <View className="flex-1" />
        {hidden > 0 ? (
          <Text variant="muted">
            {`${hidden} more ${hidden === 1 ? "game" : "games"} in the logs`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
