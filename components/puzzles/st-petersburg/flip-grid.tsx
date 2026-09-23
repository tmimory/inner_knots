import { ScrollView, View } from "react-native";

import { Text } from "@/components/ui";
import { characterDisplayName, type Character } from "@/lib/domain/character";
import type { CoinFace } from "@/lib/domain/run";
import type {
  StPetersburgEnding,
  StPetersburgFlipSummary,
  StPetersburgGameSummary,
} from "@/lib/domain/summary";
import { FLIP_GRID_GAME_LIMIT } from "@/lib/puzzles/st-petersburg/ui-helpers";
import { cn } from "@/lib/utils";

export type FlipGridProps = {
  /** The games as they stand; the engine rewrites them after every turn. */
  games: readonly StPetersburgGameSummary[];
  /** Turns a full game may run to, so the columns exist before they are played. */
  maxFlips: number;
  /** The roster's characters, for the name each row is labelled with. */
  characters: ReadonlyMap<string, Character>;
  /** How many games to draw before deferring to the logs. */
  limit?: number;
  className?: string;
};

/** How a game stopped, in one word at the end of its row. */
const ENDING_WORDS: Record<StPetersburgEnding, string> = {
  walked: "walked",
  face: "coin",
  limit: "limit",
  error: "error",
};

/** What a turn looks like in a cell, and what a screen reader hears. */
function describe(turn: StPetersburgFlipSummary): {
  glyph: string;
  said: string;
  face?: CoinFace;
} {
  if (turn.choice === "flip" && turn.face !== undefined) {
    return {
      glyph: turn.face === "heads" ? "H" : "T",
      said: `flipped ${turn.face}`,
      face: turn.face,
    };
  }
  if (turn.choice === "walk") return { glyph: "·", said: "walked away" };
  // A turn that was asked for and answered nothing: the row's ending says "error".
  return { glyph: "·", said: "no answer" };
}

/**
 * One turn of one game: the face the coin showed, or the dot that stands for a
 * turn on which the coin was not thrown.
 *
 * The two faces wear the chart's own two hues, so a row of the grid and a bar of
 * the histogram are saying the same thing in the same colours.
 */
function FlipCell({ turn, name }: { turn: StPetersburgFlipSummary; name: string }) {
  const { glyph, said, face } = describe(turn);

  return (
    <View
      accessibilityLabel={`${name}, flip ${turn.flip}: ${said}`}
      className={cn(
        "h-xl w-xl items-center justify-center rounded-sm",
        face === undefined
          ? "border-hairline border-border"
          : face === "heads"
            ? "border-thick border-primary"
            : "border-thick border-track2",
      )}
    >
      <Text
        className={cn(
          "font-mono text-xs",
          face === undefined
            ? "text-muted-foreground"
            : face === "heads"
              ? "text-primary"
              : "text-track2",
        )}
      >
        {glyph}
      </Text>
    </View>
  );
}

/** An empty column: a turn this game never reached, because it had already ended. */
function EmptyCell() {
  return <View className="h-xl w-xl rounded-sm border-hairline border-dashed border-border" />;
}

/**
 * Every game as a row of turns, so "this one always flips once more" is one
 * glance rather than a scroll through the logs.
 *
 * Read down, the rows are the run: five characters × three games each is fifteen
 * lines of the same question. Read across, one line is a game — the tosses in the
 * order they came, and the word at the right saying what stopped it. A game that
 * ended early simply runs out of cells, which is the shape the whole screen is
 * for: the length of the coloured run *is* the appetite for risk.
 */
export function FlipGrid({
  games,
  maxFlips,
  characters,
  limit = FLIP_GRID_GAME_LIMIT,
  className,
}: FlipGridProps) {
  const shown = games.slice(0, limit);
  const hidden = games.length - shown.length;
  const columns = Array.from({ length: Math.max(maxFlips, 1) }, (_, index) => index + 1);

  if (games.length === 0) {
    return (
      <Text variant="muted" className={className}>
        No games played yet.
      </Text>
    );
  }

  return (
    <View className={cn("gap-sm", className)}>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="gap-xxs">
        <View className="gap-xxs">
          {/* A row of turn numbers over a single column is the number 1 said once
              per game: the header arrives with the second flip. */}
          {columns.length > 1 ? (
            <View className="flex-row items-end gap-xxs">
              <View className="w-avatar-xl" />
              {columns.map((flip) => (
                <View key={flip} className="w-xl items-center">
                  <Text variant="muted" className="font-mono text-xs">
                    {flip}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {shown.map((game) => {
            const character = characters.get(game.characterId);
            const name = character ? characterDisplayName(character) : game.characterId;
            return (
              <View
                key={`${game.characterId}#${game.iteration}`}
                className="flex-row items-center gap-xxs"
              >
                {/* Name and game number on one line: a row that wrapped to two
                    would break the grid's own rhythm for the sake of a surname. */}
                <View className="w-avatar-xl">
                  <Text variant="muted" className="font-display text-xs" numberOfLines={1}>
                    {`${name} · ${game.iteration}`}
                  </Text>
                </View>
                {columns.map((flip) => {
                  const turn = game.flips.find((entry) => entry.flip === flip);
                  return turn ? (
                    <FlipCell key={flip} turn={turn} name={name} />
                  ) : (
                    <EmptyCell key={flip} />
                  );
                })}
                {/* The ending, quiet and at the right, where the row runs out.
                    Nothing at all while the game is still being played. */}
                <View className="w-4xl pl-xs">
                  <Text variant="meta" numberOfLines={1}>
                    {game.ending ? ENDING_WORDS[game.ending] : ""}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View className="flex-row flex-wrap items-center gap-md">
        <Text variant="muted">
          H heads · T tails · · walked away or no answer — the word at the right is how the game
          ended
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
