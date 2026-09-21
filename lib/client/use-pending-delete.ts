/**
 * The little state machine behind "are you sure?".
 *
 * A destructive row remembers *which* thing was aimed at, opens a `ConfirmDialog`
 * because something is aimed at, and has to clear the aim before running the
 * deletion so the dialog does not sit open describing a row that is already gone.
 * Written by hand that is four pieces of state handling in every screen with a
 * delete button, and they drifted; written here it is one hook.
 */
import { useCallback, useMemo, useState } from "react";

export type PendingDelete<T> = {
  /** What is aimed at, or `null`. The dialog reads its description off this. */
  target: T | null;
  /** True while something is aimed at — `ConfirmDialog`'s `open`. */
  open: boolean;
  /** Aim at one thing; this is what a Delete button calls. */
  request: (item: T) => void;
  /** Put the weapon down without firing. */
  cancel: () => void;
  /** `ConfirmDialog`'s `onOpenChange`: anything but `true` cancels. */
  onOpenChange: (open: boolean) => void;
  /**
   * Go through with it: clears the target first, then hands it to `action`, so
   * the dialog closes on the same tick the deletion starts.
   */
  confirm: (action: (item: T) => void) => void;
};

/** Nullable-target confirmation state for one list's delete control. */
export function usePendingDelete<T>(): PendingDelete<T> {
  const [target, setTarget] = useState<T | null>(null);

  const request = useCallback((item: T) => setTarget(() => item), []);
  const cancel = useCallback(() => setTarget(null), []);

  // The action runs outside the state updater: an updater may be called twice
  // (StrictMode, a replayed render) and a deletion must happen exactly once.
  const confirm = useCallback(
    (action: (item: T) => void) => {
      setTarget(null);
      if (target !== null) action(target);
    },
    [target],
  );

  const onOpenChange = useCallback((open: boolean) => {
    if (!open) setTarget(null);
  }, []);

  return useMemo(
    () => ({ target, open: target !== null, request, cancel, onOpenChange, confirm }),
    [cancel, confirm, onOpenChange, request, target],
  );
}
