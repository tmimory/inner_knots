import { View } from "react-native";

import { Segmented, Text } from "@/components/ui";
import { cn } from "@/lib/utils";

export type FacetOption<T extends string> = { value: T; label: string };

/** Stands in for "no filter" — a segmented control has no null among its values. */
const ANY = "\u0000all";

export type FilterSegmentsProps<T extends string> = {
  /** Name of the facet, shown as an eyebrow before the control. */
  label: string;
  /** The chosen value, or `null` for "any". */
  value: T | null;
  onChange: (value: T | null) => void;
  options: readonly FacetOption<T>[];
  className?: string;
};

/**
 * One facet of the character filter, drawn as a segmented control on the same
 * line as the search box.
 *
 * "All" is a segment of its own rather than an implied state of no segment being
 * lit: a filter whose resting state looks like three unchosen buttons is a filter
 * nobody can read. A facet with nothing to choose between draws nothing at all.
 *
 * The facet's name is an eyebrow outside the track, in the quiet metadata voice.
 * Inside the control's own padding it read as a fifth option that happened to be
 * unselectable; set in the small-caps display face it read as a heading over a
 * five-row list. At metadata weight it is what it is: the word that says what the
 * segments beside it choose between.
 *
 * The track carries the search field's own hairline and height, so the toolbar
 * reads as one row of chrome at one border weight rather than a saturated field
 * beside a box that is almost not there.
 */
export function FilterSegments<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: FilterSegmentsProps<T>) {
  if (options.length < 2) return null;

  return (
    <View className={cn("flex-row items-center gap-sm", className)}>
      <Text variant="meta">{label}</Text>
      <Segmented
        size="sm"
        className="h-control-md border-hairline border-border"
        label={label}
        value={value ?? ANY}
        options={[{ value: ANY, label: "All" }, ...options]}
        onChange={(next) => onChange(next === ANY ? null : (next as T))}
      />
    </View>
  );
}
