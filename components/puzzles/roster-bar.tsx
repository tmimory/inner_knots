import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Avatar } from "@/components/avatars";
import { CHARACTER_SEARCH_PLACEHOLDER, matchesCharacterQuery } from "@/components/characters";
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
import { characterDisplayName, RUN_LIMITS, type Character, type RosterEntry } from "@/lib/domain";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

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
    // Left-aligned rather than centred: a centred 64px face inside a 96px column
    // sits 16px in from the heading above it, and the indent is the first thing
    // the eye catches.
    <View className="w-avatar-xl items-start gap-xs">
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
          <Button
            variant="outline"
            size="icon"
            className="absolute right-none top-none h-lg w-lg rounded-full bg-card"
            accessibilityLabel={`Remove ${name}`}
            onPress={onRemove}
          >
            <Text className="font-mono text-xs">×</Text>
          </Button>
        ) : null}
      </View>
      <Text variant="small" numberOfLines={1}>
        {name}
      </Text>
      {showRuns ? (
        <CountStepper
          value={runs}
          onChange={onRuns}
          min={RUN_LIMITS.minRuns}
          max={RUN_LIMITS.maxRuns}
          label="Runs"
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
    <View className="w-avatar-xl items-start gap-xs">
      {label ? (
        <Text variant="meta" numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      <Pressable
        role="button"
        accessibilityLabel={label ? `Add a character to ${label}` : "Add a character"}
        disabled={!enabled}
        onPress={onPress}
        className={cn(
          "h-avatar-lg w-avatar-lg items-center justify-center rounded-full border-thick border-dashed border-border",
          "transition-colors duration-fast",
          enabled ? "bg-transparent web:hover:bg-muted" : "opacity-disabled",
        )}
      >
        <Text variant="muted" className="font-mono text-lg">
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
      <Text variant="muted">No characters yet.</Text>
      <Link href="/characters" asChild>
        <Button variant="link" size="sm">
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
 * three. `fixedSlots` is what the prisoner's dilemma needs — exactly two labelled
 * seats — while the trolley and the adventure grow their row up to `max`.
 */
export function RosterBar({
  value,
  onChange,
  characters,
  max = RUN_LIMITS.maxRoster,
  min = RUN_LIMITS.minRoster,
  showRuns = true,
  labels,
  fixedSlots,
  allowDuplicates = false,
  className,
}: RosterBarProps) {
  /** Which seat the picker is filling: an index, or `null` when it is closed. */
  const [picking, setPicking] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const byId = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters],
  );

  const slots = fixedSlots ?? Math.min(value.length + 1, max);

  const candidates = useMemo(() => {
    // The character in the seat being refilled stays on offer; the rest do not.
    const replacing = picking !== null ? value[picking]?.characterId : undefined;
    const taken = new Set(allowDuplicates ? [] : value.map((entry) => entry.characterId));
    return characters.filter(
      (character) =>
        (character.id === replacing || !taken.has(character.id)) &&
        matchesCharacterQuery(character, search),
    );
  }, [allowDuplicates, characters, picking, search, value]);

  function put(index: number, characterId: string) {
    const next = value.map((entry) => ({ ...entry }));
    const entry = { characterId, runs: next[index]?.runs ?? RUN_LIMITS.minRuns };
    if (index < next.length) next[index] = entry;
    else next.push(entry);
    onChange(next.slice(0, max));
  }

  function setRuns(index: number, runs: number) {
    onChange(value.map((entry, at) => (at === index ? { ...entry, runs } : { ...entry })));
  }

  function removeAt(index: number) {
    onChange(value.filter((_, at) => at !== index).map((entry) => ({ ...entry })));
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
      <View className="flex-row flex-wrap items-start gap-lg">
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
                onRemove={value.length > min ? () => removeAt(index) : undefined}
              />
            );
          }

          return (
            <EmptySlot
              key={`empty-${index}`}
              label={label}
              // Seats fill left to right, so only the next free one accepts a pick.
              enabled={index === value.length && value.length < max && candidates.length > 0}
              onPress={() => openPicker(index)}
            />
          );
        })}
      </View>

      <Text variant="meta">{`${value.length} of ${pluralize(max, "seat")} filled`}</Text>

      <Dialog open={picking !== null} onOpenChange={(open) => setPicking(open ? picking : null)}>
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
                <Avatar shape={character.avatar.shape} color={character.avatar.color} size="sm" />
                <View className="flex-1">
                  <Text numberOfLines={1}>{characterDisplayName(character)}</Text>
                  <Text variant="meta" numberOfLines={1}>
                    {`${character.provider} · ${character.model}`}
                  </Text>
                </View>
              </Pressable>
            ))}
            {candidates.length === 0 ? (
              <Text variant="muted">Every character is already on the roster.</Text>
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
