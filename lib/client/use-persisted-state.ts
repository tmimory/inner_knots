/**
 * State that survives a reload, for the setup a screen would be annoying to
 * rebuild — the track layout, the prompt variant, the roster.
 *
 * Web only by design: `localStorage` is where it goes when there is one, and on
 * native the hook degrades to plain `useState` rather than pulling in a storage
 * dependency for a convenience. The stored value is read in an effect, never
 * during render, because these screens are server-rendered and the server has no
 * `localStorage` — reading it in render would hydrate two different trees.
 *
 * Anything on disk is untrusted: it was written by an older build, or by hand.
 * `parse` is given the raw JSON and returns the value it trusts, or `undefined`
 * to fall back to the initial state.
 */
import { useCallback, useEffect, useRef, useState } from "react";

/** Namespace, so the app's keys are recognizable in a browser's storage inspector. */
const PREFIX = "inner-knots:";

function storage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    // Storage can be disabled outright; that is not an error worth surfacing.
    return undefined;
  }
}

export type UsePersistedState<T> = [T, (value: T) => void, { hydrated: boolean }];

/**
 * `useState`, plus a write-through to `localStorage` under `inner-knots:<key>`.
 *
 * `hydrated` says whether the stored value has been read yet, so a screen can
 * avoid acting on the initial state before the real one has arrived.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
  parse: (raw: unknown) => T | undefined,
): UsePersistedState<T> {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  // The parser is read through a ref so an inline function does not re-run the load.
  const parseRef = useRef(parse);
  useEffect(() => {
    parseRef.current = parse;
  });

  useEffect(() => {
    const store = storage();
    const raw = store?.getItem(PREFIX + key) ?? null;
    if (raw !== null) {
      try {
        const restored = parseRef.current(JSON.parse(raw));
        if (restored !== undefined) setValue(restored);
      } catch {
        // A half-written or outdated entry simply loses; the initial state stands.
      }
    }
    setHydrated(true);
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        storage()?.setItem(PREFIX + key, JSON.stringify(next));
      } catch {
        // A full or blocked quota must never break the interaction that wrote it.
      }
    },
    [key],
  );

  return [value, update, { hydrated }];
}
