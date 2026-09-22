/**
 * Splitting a field's `className` between the field and the wrapper the counter
 * needs.
 *
 * `Input` used to render a bare `TextInput`, so every caller styles it with one
 * `className` that mixes two jobs: how the control looks (`h-control-sm`,
 * `px-xs`, `font-mono`, `text-center`) and how it sits in its parent (`flex-1`,
 * `w-card`, `max-w-inspector`, `wide:w-card`). Once a counted field is wrapped in
 * a `View`, the second kind has to move to the wrapper, or a `flex-1` search
 * field stops filling its row and a `max-w-inspector` id field stops being capped.
 *
 * Doing it here rather than asking callers to pass `containerClassName` keeps the
 * primitive honest for screens nobody is editing: the class keeps meaning what it
 * meant before the wrapper existed.
 */

/** Whole classes that place a control inside its parent. */
const LAYOUT_CLASSES = new Set(["grow", "shrink", "w-full", "w-auto", "w-screen"]);

/** Class prefixes whose every member places a control inside its parent. */
const LAYOUT_PREFIXES = [
  "basis-",
  "grow-",
  "shrink-",
  "w-",
  "min-w-",
  "max-w-",
  "self-",
  "order-",
  "m-",
  "mx-",
  "my-",
  "mt-",
  "mb-",
  "ml-",
  "mr-",
  "ms-",
  "me-",
];

/**
 * `flex-1` and friends size the control in its parent's row; `flex-row` and
 * `flex-wrap` lay out its children and mean nothing on a `TextInput`, so they
 * stay where they were written rather than being quietly moved.
 */
const FLEX_SIZE = /^flex-(\d+|auto|initial|none)$/;

/** Whether one class (variants and a negative sign stripped) belongs on the wrapper. */
export function isLayoutClass(token: string): boolean {
  const bare = token.slice(token.lastIndexOf(":") + 1).replace(/^-/, "");
  if (bare === "") return false;
  if (LAYOUT_CLASSES.has(bare)) return true;
  if (FLEX_SIZE.test(bare)) return true;
  return LAYOUT_PREFIXES.some((prefix) => bare.startsWith(prefix) && bare.length > prefix.length);
}

export type SplitClasses = {
  /** Classes that place the control: they belong on the wrapper. */
  container?: string;
  /** Everything else: it belongs on the control itself. */
  field?: string;
};

/**
 * Splits a field's classes into the ones that place it and the ones that paint it.
 *
 * Returns `undefined` for an empty half so the result can be handed straight to
 * `cn()` without leaving an empty string in the class list.
 */
export function splitLayoutClasses(className?: string): SplitClasses {
  const container: string[] = [];
  const field: string[] = [];
  for (const token of (className ?? "").split(/\s+/)) {
    if (token === "") continue;
    (isLayoutClass(token) ? container : field).push(token);
  }
  return {
    container: container.length > 0 ? container.join(" ") : undefined,
    field: field.length > 0 ? field.join(" ") : undefined,
  };
}
