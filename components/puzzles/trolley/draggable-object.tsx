import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { Text } from "@/components/ui";
import type { TrolleyObject } from "@/lib/puzzles/trolley/catalogue";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme";

import { PALETTE } from "./geometry";
import { ObjectGlyph } from "./object-glyph";

/** How far the pointer must travel before this is a drag rather than a tap. */
const DRAG_THRESHOLD = 6;

export type DragPoint = { x: number; y: number };

export type DraggableObjectProps = {
  item: TrolleyObject;
  /** Fired once when a drag begins, so the board can measure its drop zones. */
  onDragStart?: () => void;
  /** Fired as the tile moves, in window coordinates, for drop-zone highlighting. */
  onDragMove?: (point: DragPoint) => void;
  /** Fired on release, in window coordinates. The tile springs home either way. */
  onDrop: (point: DragPoint) => void;
  /** The tap-to-place fallback: no drag happened, so offer the menu instead. */
  onTap: () => void;
  /** Rendered under the tile when its little "add to…" menu is open. */
  menu?: React.ReactNode;
  disabled?: boolean;
};

/**
 * One object in the palette: drag it onto a track, or tap it and pick a track.
 *
 * Both affordances exist on every platform. The drag is the one that makes the
 * board feel like a board; the tap is the one that works with a keyboard, a
 * screen reader, and on a phone where the tracks may be off screen.
 */
export function DraggableObject({
  item,
  onDragStart,
  onDragMove,
  onDrop,
  onTap,
  menu,
  disabled = false,
}: DraggableObjectProps) {
  const theme = useTheme();
  const [dragging, setDragging] = useState(false);

  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const begin = useCallback(() => {
    setDragging(true);
    onDragStart?.();
  }, [onDragStart]);

  const move = useCallback(
    (x: number, y: number) => {
      onDragMove?.({ x, y });
    },
    [onDragMove],
  );

  const end = useCallback(
    (x: number, y: number) => {
      setDragging(false);
      onDrop({ x, y });
    },
    [onDrop],
  );

  // Memoized because the screen re-renders the palette whenever the hovered
  // track changes, which is in the middle of the very gesture reporting it.
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(!disabled)
      .minDistance(DRAG_THRESHOLD)
      .onStart(() => {
        runOnJS(begin)();
      })
      .onUpdate((event) => {
        offsetX.value = event.translationX;
        offsetY.value = event.translationY;
        runOnJS(move)(event.absoluteX, event.absoluteY);
      })
      .onEnd((event) => {
        runOnJS(end)(event.absoluteX, event.absoluteY);
      })
      .onFinalize(() => {
        offsetX.value = withSpring(0);
        offsetY.value = withSpring(0);
      });

    const tap = Gesture.Tap()
      .enabled(!disabled)
      .onEnd((_event, success) => {
        if (success) runOnJS(onTap)();
      });

    return Gesture.Race(pan, tap);
    // `offsetX` / `offsetY` are reanimated shared values: stable boxes, not inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [begin, disabled, end, move, onTap]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }],
  }));

  return (
    <View
      // The menu is absolutely positioned under the tile, so this wrapper has to
      // out-stack its neighbours in the grid or the next row would cover it.
      style={{ zIndex: menu ? theme.zIndex.sticky : theme.zIndex.base }}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[style, dragging ? { zIndex: theme.zIndex.overlay } : null]}
          accessibilityRole="button"
          accessibilityLabel={`${item.label}. Drag onto a track, or activate to choose one.`}
          accessibilityHint={item.prompt}
        >
          <View
            style={{
              height: PALETTE.tileHeight,
              minWidth: PALETTE.minTileWidth,
              maxWidth: PALETTE.maxTileWidth,
            }}
            className={cn(
              // Borderless at rest: a border is what a tile earns by standing on a
              // track. The hover ring is drawn on a transparent border already in
              // the box, so picking a tile out does not nudge the row beside it.
              "items-center justify-center gap-xxs rounded-sm border-hairline border-transparent bg-transparent px-sm py-xs",
              "transition-colors duration-fast web:hover:border-border web:hover:bg-muted",
              dragging && "border-thick border-ring bg-card shadow-ink-lifted",
              disabled && "opacity-disabled",
            )}
          >
            <ObjectGlyph icon={item.icon} />
            {/*
              The label's two lines are reserved whether it needs them or not, so
              a one-word tile and a three-word tile put their glyphs on the same
              line rather than each row rocking up and down.
            */}
            <View style={{ height: PALETTE.labelHeight }} className="w-full justify-center">
              <Text
                variant="muted"
                className="text-center text-xs"
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.label}
              </Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
      {menu}
    </View>
  );
}
