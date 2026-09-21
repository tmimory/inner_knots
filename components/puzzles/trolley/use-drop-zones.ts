/**
 * Measured drop targets, hit-tested against a finger or a cursor.
 *
 * A pan gesture reports positions in window coordinates, so a drop target has to
 * be known in the same frame of reference. `onLayout` only says where a view sits
 * inside its parent, so every registered zone re-measures itself with
 * `measureInWindow` whenever its layout changes — and again on demand, because a
 * page can scroll or a panel can open without any zone's own layout changing.
 *
 * The measurements live in a mutable box held by `useState`, not in state proper
 * and not in a ref: they are read from a gesture callback, and re-rendering the
 * board every time a box moved by a pixel would be a lot of work to draw exactly
 * the same thing. The box is created once and never replaced, so nothing here
 * ever needs to run during render.
 */
import { useCallback, useMemo, useState } from "react";
import type { View } from "react-native";

export type DropZoneRect = { x: number; y: number; width: number; height: number };

export type DropZoneBinding = {
  /** Pass as the target view's `ref`; it records the node to measure. */
  attach: (node: View | null) => void;
  onLayout: () => void;
};

export type UseDropZones<Id extends string> = {
  /** The `attach` / `onLayout` pair for one zone's view. */
  bind: (id: Id) => DropZoneBinding;
  /** Which zone contains this window-space point, if any. */
  hitTest: (x: number, y: number) => Id | null;
  /** Re-measure every zone; call before a drag starts. */
  remeasure: () => void;
};

function contains(rect: DropZoneRect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

/**
 * Registers a fixed set of drop targets and answers "what is under this point?".
 *
 * The ids are fixed up front so each zone's `ref` and `onLayout` can be built
 * once, in a memo: handing a view a fresh ref callback on every render would make
 * it detach and re-attach, and the measurement would be taken over and over.
 */
export function useDropZones<Id extends string>(ids: readonly Id[]): UseDropZones<Id> {
  const [store] = useState(() => ({
    rects: new Map<Id, DropZoneRect>(),
    nodes: new Map<Id, View>(),
  }));

  const measure = useCallback(
    (id: Id) => {
      const node = store.nodes.get(id);
      if (!node) return;
      node.measureInWindow((x, y, width, height) => {
        if (Number.isFinite(x) && Number.isFinite(y) && width > 0 && height > 0) {
          store.rects.set(id, { x, y, width, height });
        }
      });
    },
    [store],
  );

  const key = ids.join("\u0000");
  const bindings = useMemo(() => {
    const map = new Map<Id, DropZoneBinding>();
    for (const id of key.split("\u0000") as Id[]) {
      map.set(id, {
        attach: (node) => {
          if (node) store.nodes.set(id, node);
          else {
            store.nodes.delete(id);
            store.rects.delete(id);
          }
        },
        onLayout: () => measure(id),
      });
    }
    return map;
  }, [key, measure, store]);

  const bind = useCallback(
    (id: Id): DropZoneBinding => bindings.get(id) ?? { attach: () => {}, onLayout: () => {} },
    [bindings],
  );

  const hitTest = useCallback(
    (x: number, y: number): Id | null => {
      for (const [id, rect] of store.rects) {
        if (contains(rect, x, y)) return id;
      }
      return null;
    },
    [store],
  );

  const remeasure = useCallback(() => {
    for (const id of store.nodes.keys()) measure(id);
  }, [measure, store]);

  return { bind, hitTest, remeasure };
}
