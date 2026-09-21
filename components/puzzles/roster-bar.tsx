import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Avatar } from "@/components/avatars";
import { CHARACTER_SEARCH_PLACEHOLDER, matchesCharacterQuery } from "@/components/characters";
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
  className?: string;
};

/** How many run-count steps one press of the stepper moves. */
const RUNS_STEP = 1;

function clampRuns(value: number): number {
  if (!Number.isFinite(value)) return RUN_LIMITS.minRuns;
  return Math.min(RUN_LIMITS.maxRuns, Math.max(RUN_LIMITS.minRuns, Math.round(value)));
}

/** The run count for one character: how many times it answers this puzzle. */
function RunsStepper({ value, onChange }: { value: number; onChange: (runs: number) => void }) {
  // What was typed, tagged with the count it produced: a half-typed "" or "1" on
  // the way to "12" stays on screen, while a count changed from outside wins.
  const [typed, setTyped] = useState<{ text: string; from: number } | null>(null);
  const text = typed?.from === value ? typed.text : String(value);

  return (
    <View className="flex-row items-center gap-xxs">
      <Button
        variant="outline"
        size="icon"
        className="h-control-sm w-control-sm"
        accessibilityLabel="One run fewer"
        disabled={value <= RUN_LIMITS.minRuns}
        onPress={() => onChange(clampRuns(value - RUNS_STEP))}
      >
        <Text className="font-mono">−</Text>
      </Button>
      <Input
        className="h-control-sm w-3xl px-xs text-center"
        keyboardType="number-pad"
        accessibilityLabel="Runs"
        value={text}
        onChangeText={(next) => {
          const parsed = Number.parseInt(next, 10);
          const runs = Number.isFinite(parsed) ? clampRuns(parsed) : value;
          setTyped({ text: next, from: runs });
          if (runs !== value) onChange(runs);
        }}
        onBlur={() => setTyped(null)}
      />
      <Button
        variant="outline"
        size="icon"
        className="h-control-sm w-control-sm"
        accessibilityLabel="One run more"
        disabled={value >= RUN_LIMITS.maxRuns}
        onPress={() => onChange(clampRuns(value + RUNS_STEP))}
      >
        <Text className="font-mono">+</Text>
      </Button>
    </View>
  );
}

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
    <View className="w-avatar-xl items-center gap-xs">
      {label ? (
        <Text variant="muted" className="font-display text-xs" numberOfLines={1}>
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
      <Text variant="small" className="text-center" numberOfLines={1}>
        {name}
      </Text>
      {showRuns ? <RunsStepper value={runs} onChange={onRuns} /> : null}
    </View>
  );
}

/** An empty labelled slot, or the "add one more" affordance. */
function EmptySlot({
  label,
  enabled,
  onPress,
}: {
  label: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <View className="w-avatar-xl items-center gap-xs">
      <Text variant="muted" className="font-display text-xs" numberOfLines={1}>
        {label}
      </Text>
      <Pressable
        role="button"
        accessibilityLabel={`Add a character to ${label}`}
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
      <Text variant="muted" className="text-center text-xs" numberOfLines={1}>
        empty
      </Text>
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
    const taken = new Set(value.map((entry) => entry.characterId));
    return characters.filter(
      (character) =>
        (character.id === replacing || !taken.has(character.id)) &&
        matchesCharacterQuery(character, search),
    );
  }, [characters, picking, search, value]);

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
              label={label ?? "Add character"}
              // Seats fill left to right, so only the next free one accepts a pick.
              enabled={index === value.length && value.length < max && candidates.length > 0}
              onPress={() => openPicker(index)}
            />
          );
        })}
      </View>

      <Text variant="muted">
        {`${value.length} of ${max} ${max === 1 ? "seat" : "seats"} filled`}
      </Text>

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
                  <Text variant="muted" numberOfLines={1}>
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
