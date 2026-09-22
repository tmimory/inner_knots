import { View } from "react-native";

import { useTheme } from "@/theme";

import { COLOR_PICKER_COLUMNS, PickerGrid } from "./shape-picker";

export type ColorPickerProps = {
  /** Currently selected pigment id. */
  value: string;
  onChange: (color: string) => void;
  className?: string;
};

/**
 * The scribe's pigment box: twenty-five swatches, each named on hover, all on one
 * row between the same edges as the faces above them.
 *
 * The chosen pigment wears the pickers' one selection ring and nothing else. A
 * check drawn inside the dot marked it by covering it — the one swatch you wanted
 * to see was the one with a glyph on top of it — and gave the pigments a second
 * selection treatment the faces did not have.
 */
export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const theme = useTheme();

  return (
    <PickerGrid
      items={theme.avatarPalette}
      columns={COLOR_PICKER_COLUMNS}
      keyOf={(pigment) => pigment.id}
      labelOf={(pigment) => pigment.label}
      isSelected={(pigment) => pigment.id === value}
      onPick={(pigment) => onChange(pigment.id)}
      renderSwatch={(pigment) => (
        <View
          // A hairline on every swatch, not only the dark ones: without it the
          // pale beige and the unbleached vellum simply vanish into the page and
          // the plate reads as twenty-three pigments with two holes in it. In the
          // page's own rule colour, not in ink: twenty-five dark circles made the
          // pigment box the heaviest object on a form whose title it sits under.
          className="h-lg w-lg rounded-full border-hairline border-border"
          style={{ backgroundColor: pigment.hex }}
        />
      )}
      className={className}
    />
  );
}
