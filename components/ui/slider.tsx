import * as SliderPrimitive from "@rn-primitives/slider";
import { useCallback, useMemo, useState, type ComponentProps } from "react";
import { PanResponder, type LayoutChangeEvent } from "react-native";

import { cn } from "@/lib/utils";
import { spacing } from "@/theme";

export type SliderProps = Omit<
  ComponentProps<typeof SliderPrimitive.Root>,
  "value" | "onValueChange"
> & {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number) => void;
};

/**
 * The thumb's diameter. It is the one number the geometry below needs in JS: the
 * thumb has to stay inside the track at both ends, so every other measure is
 * derived from the track width minus this.
 */
const THUMB = spacing.lg;

/**
 * Single-thumb slider. The primitive supplies structure and accessibility; the drag
 * handling is ours (it works the same on web and native through PanResponder).
 *
 * All three parts are laid out from one number, the thumb's travel — the track
 * width less the thumb, so the circle sits inside the rail at 0 and at max rather
 * than hanging off it. The filled range then ends at the thumb's *centre*, which
 * is what makes the fill read as the value: a fill that stops short of the handle
 * looks like a loading bar that has stalled, and was what made the control look
 * broken at every value but the ends.
 */
export function Slider({
  className,
  value,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  onValueChange,
  ...props
}: SliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const travel = Math.max(0, trackWidth - THUMB);

  const emit = useCallback(
    (x: number) => {
      if (!travel || disabled) return;
      // The pointer is read against the thumb's travel, not the raw track, so the
      // value under the cursor matches the handle it is dragging.
      const ratio = Math.min(1, Math.max(0, (x - THUMB / 2) / travel));
      const raw = min + ratio * (max - min);
      const snapped = Math.round(raw / step) * step;
      onValueChange?.(Math.min(max, Math.max(min, snapped)));
    },
    [disabled, max, min, onValueChange, step, travel],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => emit(event.nativeEvent.locationX),
        onPanResponderMove: (event) => emit(event.nativeEvent.locationX),
      }),
    [emit],
  );

  function handleLayout(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width);
  }

  const range = max - min || 1;
  const ratio = Math.min(1, Math.max(0, (value - min) / range));
  const thumbLeft = ratio * travel;

  return (
    <SliderPrimitive.Root
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={cn("h-control-sm w-full justify-center", disabled && "opacity-disabled", className)}
      {...props}
    >
      <SliderPrimitive.Track
        onLayout={handleLayout}
        {...responder.panHandlers}
        className="h-sm w-full justify-center rounded-full bg-muted"
      >
        <SliderPrimitive.Range
          style={{ width: trackWidth ? thumbLeft + THUMB / 2 : 0 }}
          className="h-full rounded-full bg-primary"
        />
        {/* Filled in the rubric red with a cream rim: the handle is the value, so
            it takes the same ink as the fill it ends, and the rim keeps it from
            dissolving into the bar it sits on. */}
        <SliderPrimitive.Thumb
          style={{ left: thumbLeft }}
          className="absolute h-lg w-lg rounded-full border-thick border-card bg-primary shadow-ink-soft"
        />
      </SliderPrimitive.Track>
    </SliderPrimitive.Root>
  );
}
