import * as SliderPrimitive from "@rn-primitives/slider";
import { useCallback, useMemo, useState, type ComponentProps } from "react";
import { PanResponder, type LayoutChangeEvent } from "react-native";

import { cn } from "@/lib/utils";

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
 * Single-thumb slider. The primitive supplies structure and accessibility; the drag
 * handling is ours (it works the same on web and native through PanResponder).
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

  const emit = useCallback(
    (x: number) => {
      const width = trackWidth;
      if (!width || disabled) return;
      const ratio = Math.min(1, Math.max(0, x / width));
      const raw = min + ratio * (max - min);
      const snapped = Math.round(raw / step) * step;
      onValueChange?.(Math.min(max, Math.max(min, snapped)));
    },
    [disabled, max, min, onValueChange, step, trackWidth],
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
          style={{ width: ratio * trackWidth }}
          className="h-full rounded-full bg-primary"
        />
        <SliderPrimitive.Thumb
          style={{ left: ratio * trackWidth }}
          className="absolute h-lg w-lg -translate-x-sm rounded-full border-hairline border-border bg-card shadow-ink-soft"
        />
      </SliderPrimitive.Track>
    </SliderPrimitive.Root>
  );
}
