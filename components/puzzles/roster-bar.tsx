import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Avatar } from "@/components/avatars";
import {
  CHARACTER_SEARCH_PLACEHOLDER,
  matchesCharacterQuery,
} from "@/components/characters";
import { CountStepper } from "@/components/puzzles/count-stepper";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Text,
} from "@/components/ui";
import {
  characterDisplayName,
  RUN_LIMITS,
  type Character,
  type RosterEntry,
} from "@/lib/domain";
import { pluralize } from "@/lib/format";
import { cn, indexById } from "@/lib/utils";

export type { RosterEntry };

export type RosterBarProps = {
  /** The roster, in the order the puzzle will read it. */
  value: readonly RosterEntry[];
  onChange: (value: RosterEntry[]) => void;
  /** Every character on the roster screen, for the picker and the medallions. */
  characters: readonly Character[];
  /** Most characters the puzzle accepts. Defaults to `RUN_LIMITS.maxRoster`. */
  max?: number;
  /** Fewest the puzzle accepts; below this the remove control is withheld. */
  min?: number;
  /** Show the per-character run count. Off for puzzles that run each once. */
  showRuns?: boolean;
  /**
   * Show the "2 of 5 seats filled" line under the row. The seats themselves
   * already say it — five circles, two of them with faces in — so a screen that
   * draws the whole row can turn the sentence off.
   */
  showCount?: boolean;
  /** Names for the slots, e.g. `["Player A", "Player B"]`. */
  labels?: readonly string[];
  /**
   * Render exactly this many labelled slots instead of a growing row. Slots fill
   * left to right: the next empty one is the one that opens the picker.
   */
  fixedSlots?: number;
  /**
   * Let the same character take more than one seat. The prisoner's dilemma wants
   * this — a character playing itself is a run worth making — and the puzzles
   * that read a roster as a cast of distinct answerers do not.
   */
  allowDuplicates?: boolean;
  className?: string;
};

/**
 * The width of one seat, and the air between two of them.
 *
 * A seat is a fixed column — `layout.seat`, wide enough for the stepper, which is
 * the widest of the three things stacked in it — with everything in it centred on
 * the face above. Sized to the avatar instead, the steppers of two neighbouring
 * seats ran into each other and read as one six-button control belonging to
 * nobody. The gap is a full `xl` so the columns stay separate objects.
 */
const SEAT = "w-seat items-center gap-xs";

/** One column of the bar: a face, a name, and what it is asked to do. */
function Medallion({
  character,
  fallbackId,
  label,
  runs,
  showRuns,
  onRuns,
  onRemove,
  onPress,
}: {
  character?: Character;
  fallbackId: string;
  label?: string;
  runs: number;
  showRuns: boolean;
  onRuns: (runs: number) => void;
  onRemove?: () => void;
  onPress?: () => void;
}) {
  const name = character ? characterDisplayName(character) : fallbackId;

  return (
    <View className={SEAT}>
      {label ? (
        <Text variant="meta" numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      <View>
        <Pressable
          role="button"
          accessibilityLabel={onPress ? `Replace ${name}` : name}
          disabled={onPress === undefined}
          onPress={onPress}
        >
          <Avatar
            shape={character?.avatar.shape ?? ""}
            color={character?.avatar.color ?? ""}
            size="lg"
            className={cn(character ? undefined : "opacity-disabled")}
          />
        </Pressable>
        {onRemove ? (
          // Nudged a hairline pair outward so the badge sits tangent to the ring
          // rather than biting a chunk out of the face behind it.
          <Button
            variant="outline"
            size="icon"
            className="absolute -right-xxs -top-xxs h-lg w-lg rounded-full bg-card"
            accessibilityLabel={`Remove ${name}`}
            onPress={onRemove}
          >
            <Text className="font-mono text-xs">×</Text>
          </Button>
        ) : null}
      </View>
      <Text variant="small" numberOfLines={1} className="text-center">
        {name}
      </Text>
      {showRuns ? (
        // No caption under the stepper. The word "runs" was the smallest type in
        // the app, set under a control that already says what it counts — a minus,
        // a number and a plus under a portrait is a count of that character's
        // answers, and the screen's own section names it. The label lives on the
        // control instead, where a screen reader reads it and the page does not
        // have to carry a fourth type size.
        <CountStepper
          value={runs}
          onChange={onRuns}
          min={RUN_LIMITS.minRuns}
          max={RUN_LIMITS.maxRuns}
          label="runs"
        />
      ) : null}
    </View>
  );
}

/** An empty labelled slot, or the "add one more" affordance. */
function EmptySlot({
  label,
  enabled,
  onPress,
}: {
  /** The seat's name, when the puzzle names its seats. */
  label?: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <View className={SEAT}>
      {label ? (
        <Text variant="meta" numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      {/*
        Every empty seat is drawn the same: the dashed ring at full strength with a
        `+` inside it. Two seats side by side that differ only in whether they
        carry a mark read as one seat being broken, when all that separates them is
        which one the next pick happens to land in — and the row exists to show how
        many seats there are, so fading four of five would hide its whole point.
        The quieter ink on the seats that are not next is the only difference.
      */}
      <Pressable
        role="button"
        accessibilityLabel={
          label ? `Add a character to ${label}` : "Add a character"
        }
        disabled={!enabled}
        onPress={onPress}
        className={cn(
          "h-avatar-lg w-avatar-lg items-center justify-center rounded-full border-thick border-dashed border-border",
          "transition-colors duration-fast",
          enabled && "web:hover:bg-muted",
        )}
      >
        <Text
          className={cn(
            "font-mono text-lg",
            enabled ? "text-muted-foreground" : "text-subtle-foreground",
          )}
        >
          +
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * What there is to say when the roster screen is empty: there is no cast to seat
 * until a character exists, so the bar sends the user to make one rather than
 * offering three empty slots that cannot be filled. Every puzzle screen showed
 * this itself; the bar owns it now, which is why it knows about routing.
 */
function NoCharacters() {
  return (
    <View className="flex-row flex-wrap items-center gap-sm">
      <Text variant="muted" className="text-base">
        No characters yet.
      </Text>
      <Link href="/characters" asChild>
        <Button variant="link">
          <Text>Make one</Text>
        </Button>
      </Link>
    </View>
  );
}

/**
 * The cast of a run: who answers this puzzle, and how many times each.
 *
 * Every puzzle screen uses this one bar, so a roster means the same thing on all
 * three. It draws `max` seats — `RUN_LIMITS.maxRoster` unless the puzzle says
 * otherwise, never a number written into a screen — and fills them left to right,
 * so the capacity of the run is visible before anyone is seated. `fixedSlots` is
 * the prisoner's dilemma's exactly-two-labelled-seats.
 */
export function RosterBar({
  value,
  onChange,
  characters,
  max = RUN_LIMITS.maxRoster,
  min = RUN_LIMITS.minRoster,
  showRuns = true,
  showCount = true,
  labels,
  fixedSlots,
  allowDuplicates = false,
  className,
}: RosterBarProps) {
  /** Which seat the picker is filling: an index, or `null` when it is closed. */
  const [picking, setPicking] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const byId = useMemo(() => indexById(characters), [characters]);

  // Every seat the puzzle has, drawn whether or not it is taken: a row of dashed
  // circles says "five of these" at a glance, where one lone `+` in a band of air
  // says only "another one, maybe". `max` comes from the puzzle's own limit.
  const slots = fixedSlots ?? max;

  const candidates = useMemo(() => {
    // The character in the seat being refilled stays on offer; the rest do not.
    const replacing =
      picking !== null ? value[picking]?.characterId : undefined;
    const taken = new Set(
      allowDuplicates ? [] : value.map((entry) => entry.characterId),
    );
    return characters.filter(
      (character) =>
        (character.id === replacing || !taken.has(character.id)) &&
        matchesCharacterQuery(character, search),
    );
  }, [allowDuplicates, characters, picking, search, value]);

  function put(index: number, characterId: string) {
    const next = value.map((entry) => ({ ...entry }));
    const entry = {
      characterId,
      runs: next[index]?.runs ?? RUN_LIMITS.minRuns,
    };
    if (index < next.length) next[index] = entry;
    else next.push(entry);
    onChange(next.slice(0, max));
  }

  function setRuns(index: number, runs: number) {
    onChange(
      value.map((entry, at) =>
        at === index ? { ...entry, runs } : { ...entry },
      ),
    );
  }

  function removeAt(index: number) {
    onChange(
      value.filter((_, at) => at !== index).map((entry) => ({ ...entry })),
    );
  }

  function openPicker(index: number) {
    setSearch("");
    setPicking(index);
  }

  if (characters.length === 0) {
    return (
      <View className={className}>
        <NoCharacters />
      </View>
    );
  }

  return (
    <View className={cn("gap-sm", className)}>
      <View className="flex-row flex-wrap items-start gap-xl">
        {Array.from({ length: slots }, (_, index) => {
          const entry = value[index];
          const label = labels?.[index];

          if (entry) {
            return (
              <Medallion
                key={`${index}-${entry.characterId}`}
                character={byId.get(entry.characterId)}
                fallbackId={entry.characterId}
                label={label}
                runs={entry.runs}
                showRuns={showRuns}
                onRuns={(runs) => setRuns(index, runs)}
                onPress={() => openPicker(index)}
                onRemove={
                  value.length > min ? () => removeAt(index) : undefined
                }
              />
            );
          }

          return (
            <EmptySlot
              key={`empty-${index}`}
              label={label}
              // Seats fill left to right, so only the next free one accepts a pick.
              enabled={
                index === value.length &&
                value.length < max &&
                candidates.length > 0
              }
              onPress={() => openPicker(index)}
            />
          );
        })}
      </View>

      {showCount ? (
        <Text variant="meta">{`${value.length} of ${pluralize(max, "seat")} filled`}</Text>
      ) : null}

      <Dialog
        open={picking !== null}
        onOpenChange={(open) => setPicking(open ? picking : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose a character</DialogTitle>
          </DialogHeader>
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder={CHARACTER_SEARCH_PLACEHOLDER}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <ScrollView contentContainerClassName="gap-xxs">
            {candidates.map((character) => (
              <Pressable
                key={character.id}
                role="button"
                className="flex-row items-center gap-md rounded-md p-sm transition-colors duration-fast active:bg-muted web:hover:bg-muted"
                onPress={() => {
                  if (picking !== null) put(picking, character.id);
                  setPicking(null);
                }}
              >
                <Avatar
                  shape={character.avatar.shape}
                  color={character.avatar.color}
                  size="sm"
                />
                <View className="flex-1">
                  <Text numberOfLines={1}>
                    {characterDisplayName(character)}
                  </Text>
                  <Text variant="meta" numberOfLines={1}>
                    {`${character.provider} · ${character.model}`}
                  </Text>
                </View>
              </Pressable>
            ))}
            {candidates.length === 0 ? (
              <Text variant="muted">
                Every character is already on the roster.
              </Text>
            ) : null}
          </ScrollView>
          <View className="flex-row justify-end">
            <Button variant="outline" onPress={() => setPicking(null)}>
              <Text>Cancel</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  );
}
