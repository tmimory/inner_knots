import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

import { borderWidths, layout } from "@/theme/tokens";

/**
 * The theme's border widths are named (`hairline`, `thick`) rather than numeric, so
 * stock tailwind-merge reads `border-hairline` as a border *colour* and lets a later
 * `border-border` delete it. Teaching it the scale keeps width and colour together.
 */
const BORDER_WIDTHS = Object.keys(borderWidths);

/**
 * Likewise the layout measures (`menu`, `content`, …) are named, so tailwind-merge
 * keeps both `max-w-menu` and `max-w-content` and the stylesheet's alphabetical
 * order decides: the dialog's default 264px menu width beat every wider override.
 */
const LAYOUT_MEASURES = Object.keys(layout);

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "border-w": [{ border: BORDER_WIDTHS }],
      "border-w-x": [{ "border-x": BORDER_WIDTHS }],
      "border-w-y": [{ "border-y": BORDER_WIDTHS }],
      "border-w-t": [{ "border-t": BORDER_WIDTHS }],
      "border-w-r": [{ "border-r": BORDER_WIDTHS }],
      "border-w-b": [{ "border-b": BORDER_WIDTHS }],
      "border-w-l": [{ "border-l": BORDER_WIDTHS }],
      w: [{ w: LAYOUT_MEASURES }],
      "max-w": [{ "max-w": LAYOUT_MEASURES }],
      "min-w": [{ "min-w": LAYOUT_MEASURES }],
    },
  },
});

/**
 * Merges Tailwind class names: `clsx` for conditionals, `tailwind-merge` so a later
 * class wins over an earlier one in the same utility group.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
