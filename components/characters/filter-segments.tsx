import { View } from "react-native";

import { Segmented, Text } from "@/components/ui";
import { cn } from "@/lib/utils";

export type FacetOption<T extends string> = { value: T; label: string };

/** Stands in for "no filter" — a segmented control has no null among its values. */
const ANY = "\u0000all";

export type FilterSegmentsProps<T extends string> = {
  /** Name of the facet, shown before the control. */
  label: string;
  /** The chosen value, or `null` for "any". */
  value: T | null;
  onChange: (value: T | null) => void;
  options: readonly FacetOption<T>[];
  className?: string;
};

/**
 * One facet of the character filter, drawn as the form's segmented control so the
 * toolbar reads as one row of fields rather than a search box beside some chips.
 *
 * "All" is a segment of its own rather than an implied state of no segment being
 * lit: a filter whose resting state looks like three unchosen buttons is a filter
 * nobody can read. A facet with nothing to choose between draws nothing at all.
 *
 * The facet's name sits inside the control's own left padding rather than beside
 * it. Outside, it was a word floating in the gap between two fields, belonging to
 * neither; inside, it is the control's eyebrow and the whole thing reads as one
 * object the width of a field.
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
    <View
      className={cn(
        "h-control-md flex-row items-center gap-sm self-start rounded-sm bg-input py-xs pl-md pr-xs",
        className,
      )}
    >
      <Text variant="subtle">{label}</Text>
      <Segmented
        size="sm"
        className="bg-transparent p-none"
        label={label}
        value={value ?? ANY}
        options={[{ value: ANY, label: "All" }, ...options]}
        onChange={(next) => onChange(next === ANY ? null : (next as T))}
      />
    </View>
  );
}
