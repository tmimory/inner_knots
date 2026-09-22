import { Pressable, View } from "react-native";

import { Text } from "@/components/ui";
import { cn } from "@/lib/utils";

/** One framing on offer. The copy is UI copy; the prompt itself lives in markdown. */
export type VariantOption<Id extends string = string> = {
  id: Id;
  label: string;
  /** One line saying what this framing does to the question. */
  description: string;
};

export type VariantSelectProps<Id extends string = string> = {
  value: Id;
  onChange: (value: Id) => void;
  options: readonly VariantOption<Id>[];
  /** Accessible name for the group as a whole. */
  label?: string;
  /**
   * Where the one-line description sits. `below` (the default) puts it under its
   * label, so every label and every sentence starts on one axis; `inline` keeps
   * the old one-line row, for a list of two-word options whose descriptions are
   * short enough to share the line.
   */
  descriptions?: "inline" | "below";
  className?: string;
};

/**
 * The leading radio: an empty ring that takes a solid rubric-red dot when chosen.
 *
 * In the stacked layout the row is aligned to its top, so the ring is nudged down
 * by the difference between its own 16px and the label's 26px line box — a mark
 * hung from the top of a two-line block reads as belonging to the block, not to
 * the word it is beside.
 */
function RadioMark({
  selected,
  className,
}: {
  selected: boolean;
  className?: string;
}) {
  return (
    <View
      className={cn(
        "h-lg w-lg items-center justify-center rounded-full border-hairline transition-colors duration-fast",
        selected ? "border-primary bg-transparent" : "border-border bg-input",
        className,
      )}
    >
      {selected ? <View className="h-sm w-sm rounded-full bg-primary" /> : null}
    </View>
  );
}

/**
 * The option's name. Choosing it changes the weight, not the colour: the medium
 * cut of the body serif is a visible step up at reading size and costs the page
 * none of its one accent.
 */
function labelClasses(selected: boolean): string {
  return selected
    ? "font-bodyMedium text-foreground"
    : "font-body text-foreground";
}

/**
 * A radio list of prompt framings: one row each, the name on the first line and
 * what it does to the question on the second.
 *
 * The description is part of the control rather than a tooltip — choosing between
 * "a thought experiment" and "you work for the trolley company" is the choice the
 * screen is actually about. As equal-width tiles the copy wrapped at three
 * different depths and the row read as three unrelated cards; as rows the eye
 * runs down one edge and compares the sentences. Stacking the sentence under its
 * label is what makes that edge real: set on the same line, each description
 * started wherever its label happened to end, so three explanations began at
 * three different places and none of them could be compared with the others.
 *
 * Choosing marks the row and nothing else: the radio fills with the rubric red
 * and the label goes to the dark ink in the medium weight. No band, no border, no
 * fill. A full-width tan plate under the chosen line outweighed the screen's
 * primary button; a red label made a setting read as a fourth voice competing
 * with the page's one primary action, where weight says "this one" just as
 * plainly. Every row keeps the same padding in both states, so choosing does not
 * shift the column a pixel.
 */
export function VariantSelect<Id extends string = string>({
  value,
  onChange,
  options,
  label = "Prompt variant",
  descriptions = "below",
  className,
}: VariantSelectProps<Id>) {
  const stacked = descriptions === "below";

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className={cn("gap-xs", className)}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            role="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={option.label}
            accessibilityHint={option.description}
            onPress={() => onChange(option.id)}
            className={cn(
              "flex-row gap-md rounded-sm px-md py-sm transition-colors duration-fast",
              stacked ? "items-start" : "flex-wrap items-baseline gap-y-xxs",
              selected
                ? "bg-transparent"
                : "bg-transparent active:bg-muted/subtle web:hover:bg-muted/subtle",
            )}
          >
            <RadioMark
              selected={selected}
              className={stacked ? "mt-xs" : "self-center"}
            />
            {stacked ? (
              <View className="flex-1 gap-xxs">
                <Text className={labelClasses(selected)}>{option.label}</Text>
                <Text variant="meta">{option.description}</Text>
              </View>
            ) : (
              <>
                <Text className={labelClasses(selected)}>{option.label}</Text>
                <Text variant="meta" className="flex-1">
                  {option.description}
                </Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
