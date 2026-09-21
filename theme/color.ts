/**
 * Pure color helpers shared by the runtime theme and the CSS generator script.
 * No literal design values live here — only math.
 */

/** Turns `#RRGGBB` into the `"r g b"` channel string Tailwind's `rgb(... / <alpha-value>)` expects. */
export function hexToRgbChannels(hex: string): string {
  const normalized = hex.replace("#", "").trim();
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  if (full.length !== 6) {
    throw new Error(`Expected a 6-digit hex color, received "${hex}"`);
  }
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** `camelCase` -> `kebab-case`, used for CSS variable and Tailwind key names. */
export function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
