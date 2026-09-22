import { View } from "react-native";

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type SelectOption,
} from "@/components/ui";
import { characterDisplayName, type Character } from "@/lib/domain/character";
import { RUN_STATUSES, type PuzzleId, type RunStatus } from "@/lib/domain/run";
import { cn } from "@/lib/utils";

import { PUZZLE_LABELS, PUZZLE_OPTIONS } from "./labels";

/** What the run list is currently showing. `undefined` means "no filter". */
export type RunFilters = {
  puzzle?: PuzzleId;
  status?: RunStatus;
  characterId?: string;
  /** Free text matched against the run id. */
  search: string;
};

export const EMPTY_FILTERS: RunFilters = { search: "" };

/** The option a `Select` shows for "no filter at all". */
const ANY = "any";

type ChoiceProps = {
  label: string;
  value?: string;
  options: readonly { value: string; label: string }[];
  placeholder: string;
  onChange: (value?: string) => void;
};

/**
 * One filter dropdown. The "any" row is part of the option list rather than a
 * separate control, so clearing a filter is the same gesture as setting one.
 *
 * It carries no visible label: the unfiltered state already says what the
 * control is about ("every puzzle", "any status", "anyone"), and four stacked
 * label-and-field pairs turn a toolbar back into a form.
 */
function Choice({ label, value, options, placeholder, onChange }: ChoiceProps) {
  const selected = options.find((option) => option.value === value);
  const current: SelectOption = selected ?? { value: ANY, label: placeholder };

  return (
    <Select
      value={current}
      onValueChange={(option) => onChange(option?.value === ANY ? undefined : option?.value)}
    >
      {/* A facet that is doing something looks different from one that is not:
          the selection tan, a step deeper than the field's own fill. Four
          identical boxes gave the reader no way to see, without reading all four,
          that the ledger in front of them had been narrowed. */}
      <SelectTrigger
        accessibilityLabel={label}
        className={cn(selected !== undefined && "border-transparent bg-selection")}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem label={placeholder} value={ANY} />
        {options.map((option) => (
          <SelectItem key={option.value} label={option.label} value={option.value} />
        ))}
      </SelectContent>
    </Select>
  );
}

export type RunFiltersBarProps = {
  filters: RunFilters;
  characters: ReadonlyMap<string, Character>;
  onChange: (filters: RunFilters) => void;
};

/**
 * One toolbar over the ledger: the free-text search and the three facets that
 * narrow the query, as one group at the left.
 *
 * The search is a card's width, not half the window: what goes into it is a short
 * hash, and stretched to 566px it left the facets marooned two hundred pixels
 * away with nothing between them. Sized to its content, the four controls butt
 * against each other and read as one toolbar.
 */
export function RunFiltersBar({ filters, characters, onChange }: RunFiltersBarProps) {
  const characterOptions = [...characters.values()].map((character) => ({
    value: character.id,
    label: characterDisplayName(character),
  }));

  return (
    <View className="gap-md wide:flex-row wide:items-center">
      <Input
        className="wide:w-card"
        accessibilityLabel="Search by run id"
        value={filters.search}
        placeholder="search the ledger by run id"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={(search) => onChange({ ...filters, search })}
      />
      <View className="flex-row items-center gap-md">
        <Choice
          label="Puzzle"
          placeholder="every puzzle"
          value={filters.puzzle}
          options={PUZZLE_OPTIONS}
          onChange={(value) => onChange({ ...filters, puzzle: value as PuzzleId | undefined })}
        />
        <Choice
          label="Status"
          placeholder="any status"
          value={filters.status}
          options={RUN_STATUSES.map((status) => ({ value: status, label: status }))}
          onChange={(value) => onChange({ ...filters, status: value as RunStatus | undefined })}
        />
        <Choice
          label="Character"
          placeholder="anyone"
          value={filters.characterId}
          options={characterOptions}
          onChange={(value) => onChange({ ...filters, characterId: value })}
        />
      </View>
    </View>
  );
}

/** True when a run should be shown under the current free-text search. */
export function matchesSearch(runId: string, search: string): boolean {
  const needle = search.trim().toLowerCase();
  return needle === "" || runId.toLowerCase().includes(needle);
}

/** A short description of what is being filtered out, for the header badge. */
export function filterSummary(filters: RunFilters): string | undefined {
  const parts = [
    filters.puzzle === undefined ? undefined : PUZZLE_LABELS[filters.puzzle],
    filters.status,
    filters.characterId,
    filters.search.trim() === "" ? undefined : `"${filters.search.trim()}"`,
  ].filter((part): part is string => part !== undefined);
  return parts.length === 0 ? undefined : parts.join(" · ");
}
