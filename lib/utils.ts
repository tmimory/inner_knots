import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

import { borderWidths } from "@/theme/tokens";

/**
 * The theme's border widths are named (`hairline`, `thick`) rather than numeric, so
 * stock tailwind-merge reads `border-hairline` as a border *colour* and lets a later
 * `border-border` delete it. Teaching it the scale keeps width and colour together.
 */
const BORDER_WIDTHS = Object.keys(borderWidths);

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
