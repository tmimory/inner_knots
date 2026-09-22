import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

import { borderWidths, layout, sizes } from "@/theme/tokens";

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

/**
 * And the sizing scale itself — the spacing steps, the control heights, the avatar
 * diameters and the hairline widths that all answer `p-*` / `gap-*` / `h-*`.
 *
 * This is the one that bit hardest. Stock tailwind-merge only knows numeric spacing,
 * so `gap-3xl` and `gap-lg` looked like two unrelated classes: a screen passing
 * `className="gap-3xl"` into a component that already sets `gap-lg` kept both, and
 * the generated stylesheet's own order decided the winner — the override silently
 * did nothing and two screens wrote their layout by hand to get around it. The same
 * fault swallowed `h-control-sm` next to a Button's `h-control-icon`.
 */
const SIZING_STEPS = Object.keys(sizes);

/**
 * The utilities that draw from the sizing scale, as `<class prefix>: <group id>`.
 *
 * Every entry's group id is its own prefix, which is how tailwind-merge names these
 * groups, so the table is the prefix list and the extension is generated from it
 * rather than written out twenty times.
 */
const SIZING_PREFIXES = [
  "gap",
  "gap-x",
  "gap-y",
  "p",
  "px",
  "py",
  "pt",
  "pr",
  "pb",
  "pl",
  "m",
  "mx",
  "my",
  "mt",
  "mr",
  "mb",
  "ml",
  "space-x",
  "space-y",
  "inset",
  "inset-x",
  "inset-y",
  "top",
  "right",
  "bottom",
  "left",
  "size",
  "h",
] as const;

const sizingGroups = Object.fromEntries(
  SIZING_PREFIXES.map((prefix) => [prefix, [{ [prefix]: SIZING_STEPS }]]),
);

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      ...sizingGroups,
      "border-w": [{ border: BORDER_WIDTHS }],
      "border-w-x": [{ "border-x": BORDER_WIDTHS }],
      "border-w-y": [{ "border-y": BORDER_WIDTHS }],
      "border-w-t": [{ "border-t": BORDER_WIDTHS }],
      "border-w-r": [{ "border-r": BORDER_WIDTHS }],
      "border-w-b": [{ "border-b": BORDER_WIDTHS }],
      "border-w-l": [{ "border-l": BORDER_WIDTHS }],
      // The focus ring has the same problem, and worse consequences: read as a
      // colour, `ring-thick` was deleted by the `ring-ring` beside it and every
      // focus ring in the app came out at the stock width.
      "ring-w": [{ ring: BORDER_WIDTHS }],
      "outline-w": [{ outline: BORDER_WIDTHS }],
      // A width can be either a sizing step (`w-lg`, `w-avatar-md`) or one of the
      // layout measures; the min/max widths are generated from the measures alone.
      w: [{ w: [...SIZING_STEPS, ...LAYOUT_MEASURES] }],
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

/**
 * Items keyed by their own id, for the lookups a screen does once per row.
 *
 * Every screen that draws characters beside a run holds one of these, and each
 * had written the same `new Map(items.map((item) => [item.id, item]))`. A later
 * entry wins, which is what the engine's catalogue wants: custom objects are
 * loaded over the built-in ones and replace them by id.
 */
export function indexById<T extends { id: string }>(
  items: Iterable<T>,
): Map<string, T> {
  const index = new Map<string, T>();
  for (const item of items) index.set(item.id, item);
  return index;
}
