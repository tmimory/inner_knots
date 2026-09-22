/**
 * Copying a string to the clipboard, and the button admitting it worked.
 *
 * Two places offer a copy — a run's full id beside its title, the composed prompt
 * in the character rail — and each had written the same guarded `navigator`
 * access, the same `copied` flag and the same timer to take it back.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { durations } from "@/theme";

/**
 * How long the control admits to having copied before going back to the offer.
 *
 * Long enough to be read after the eye has moved on, short enough that the button
 * is offering again by the time anyone wants it twice.
 */
export const COPIED_MS = durations.slow * 4;

/**
 * Puts text on the clipboard where the platform has one.
 *
 * Guarded rather than assumed: `navigator.clipboard` is absent on native and on
 * an insecure origin, and a promise that rejects into nothing is how a button
 * ends up claiming to have done something it did not.
 */
export function copyToClipboard(text: string): Promise<boolean> {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return Promise.resolve(false);
  const clipboard: Clipboard | undefined = navigator.clipboard;
  if (clipboard === undefined) return Promise.resolve(false);
  return clipboard.writeText(text).then(
    () => true,
    () => false,
  );
}

export type UseClipboardCopyResult = {
  /** True for {@link COPIED_MS} after a copy that actually landed. */
  copied: boolean;
  /** Copies what `getValue` returns now, and reveals the acknowledgement. */
  copy: () => void;
};

/**
 * The state behind a "Copy" control: press it, it says "Copied", then it offers
 * again. Nothing is acknowledged on a platform with no clipboard, because the
 * one thing worse than no copy is a button that says it copied and did not.
 *
 * `getValue` is read at press time rather than captured, so a panel whose text is
 * still being composed copies what is on screen when it is pressed.
 */
export function useClipboardCopy(getValue: () => string): UseClipboardCopyResult {
  const [copied, setCopied] = useState(false);

  // The latest getter, so the callback is stable and the button does not re-render
  // every time the value behind it changes a character.
  const latest = useRef(getValue);
  latest.current = getValue;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(() => {
    void copyToClipboard(latest.current()).then((ok) => {
      if (ok) setCopied(true);
    });
  }, []);

  return { copied, copy };
}
