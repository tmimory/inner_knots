import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { LayoutChangeEvent, ScrollView, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

import { Text } from "@/components/ui";
import type { TrolleyObject } from "@/lib/puzzles/trolley/catalogue";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/theme";

import {
  BOARD,
  TROLLEY,
  branchRail,
  laneLeft,
  laneTop,
  railEnd,
  railY,
  slotsLeft,
  straightRail,
  tieXs,
  type TrackId,
} from "./geometry";
import { ObjectChip } from "./object-chip";
import type { DropZoneBinding, UseDropZones } from "./use-drop-zones";

/** The two tracks, as drop-zone ids. */
export const TRACK_ZONE_IDS = ["track1", "track2"] as const;
export type TrackZoneId = (typeof TRACK_ZONE_IDS)[number];

/** `"track2"` -> `2`. */
export function trackOf(zone: TrackZoneId): TrackId {
  return zone === "track1" ? 1 : 2;
}

/** `2` -> `"track2"`. */
export function zoneOf(track: TrackId): TrackZoneId {
  return track === 1 ? "track1" : "track2";
}

/**
 * The two rails' hues.
 *
 * Track 1 is the rubric red the whole page is set in and track 2 the brown ink
 * beside it: a cool blue rail was the only cold thing on a parchment screen, and
 * it read as a link rather than as "the track the trolley is already on".
 */
function trackColor(theme: Theme, track: TrackId): string {
  return track === 1 ? theme.colors.primary : theme.colors.track2;
}

/** One rail pair plus its sleepers, drawn along a straight run. */
function StraightTrack({
  y,
  fromX,
  toX,
  color,
  theme,
}: {
  y: number;
  fromX: number;
  toX: number;
  color: string;
  theme: Theme;
}) {
  const half = BOARD.railHalfGap;
  const tieTop = y - half - BOARD.tieOverhang;
  const tieBottom = y + half + BOARD.tieOverhang;

  return (
    <G>
      {tieXs(fromX, toX).map((x) => (
        <Path
          key={`tie-${x}`}
          d={`M${x} ${tieTop} V${tieBottom}`}
          stroke={theme.colors.border}
          strokeWidth={theme.borderWidths.thick}
        />
      ))}
      <Path d={straightRail(y - half, fromX, toX)} stroke={color} strokeWidth={theme.borderWidths.thick} />
      <Path d={straightRail(y + half, fromX, toX)} stroke={color} strokeWidth={theme.borderWidths.thick} />
    </G>
  );
}

/** The buffer stop a track ends at: a bar across the rails, short of the edge. */
function Terminus({ x, y, color, theme }: { x: number; y: number; color: string; theme: Theme }) {
  return (
    <G>
      <Path
        d={`M${x} ${y - BOARD.terminusHalfHeight} V${y + BOARD.terminusHalfHeight}`}
        stroke={color}
        strokeWidth={theme.borderWidths.thick}
      />
      <Path
        d={`M${x - BOARD.railHalfGap} ${y} H${x}`}
        stroke={color}
        strokeWidth={theme.borderWidths.thick}
      />
    </G>
  );
}

/** The rails, the sleepers, the junction, the lever and the two buffer stops. */
function Rails({ width, theme }: { width: number; theme: Theme }) {
  const junction = { x: BOARD.junctionX, y: BOARD.rail1Y };
  const end = railEnd(width);

  return (
    <Svg
      width={width}
      height={BOARD.height}
      viewBox={`0 0 ${width} ${BOARD.height}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityRole="image"
      aria-label="Two tracks branching from a junction"
    >
      <StraightTrack
        y={BOARD.rail1Y}
        fromX={0}
        toX={BOARD.junctionX}
        color={theme.colors.mutedForeground}
        theme={theme}
      />
      <StraightTrack
        y={BOARD.rail1Y}
        fromX={BOARD.junctionX}
        toX={end}
        color={trackColor(theme, 1)}
        theme={theme}
      />
      <StraightTrack
        y={BOARD.rail2Y}
        fromX={BOARD.junctionX + BOARD.branchRun}
        toX={end}
        color={trackColor(theme, 2)}
        theme={theme}
      />

      <Terminus x={end} y={BOARD.rail1Y} color={trackColor(theme, 1)} theme={theme} />
      <Terminus x={end} y={BOARD.rail2Y} color={trackColor(theme, 2)} theme={theme} />

      <Path
        d={branchRail(-BOARD.railHalfGap)}
        stroke={trackColor(theme, 2)}
        strokeWidth={theme.borderWidths.thick}
      />
      <Path
        d={branchRail(BOARD.railHalfGap)}
        stroke={trackColor(theme, 2)}
        strokeWidth={theme.borderWidths.thick}
      />

      <Circle
        cx={junction.x}
        cy={junction.y}
        r={BOARD.railHalfGap}
        fill={theme.colors.card}
        stroke={theme.colors.accent}
        strokeWidth={theme.borderWidths.thick}
      />

      <G
        transform={`translate(${junction.x + TROLLEY.lever.offsetX}, ${junction.y + TROLLEY.lever.offsetY})`}
      >
        <Path
          d={TROLLEY.lever.base}
          stroke={theme.colors.mutedForeground}
          strokeWidth={theme.borderWidths.thick}
        />
        <Path d={TROLLEY.lever.post} stroke={theme.colors.foreground} strokeWidth={theme.borderWidths.thick} />
        <Path d={TROLLEY.lever.arm} stroke={theme.colors.accent} strokeWidth={theme.borderWidths.thick} />
      </G>
    </Svg>
  );
}

/**
 * The band a track's objects stand in, and the drop target they arrive through.
 *
 * The band is a fixed row of `max` slots rather than a wrapping bag of chips, so
 * an empty track still shows how many things it will take and where each one will
 * stand — the capacity is drawn rather than written under the board.
 */
function Lane({
  track,
  items,
  width,
  hovered,
  max,
  showSlots,
  zone: { attach, onLayout },
  onRemove,
}: {
  track: TrackId;
  items: readonly TrolleyObject[];
  width: number;
  hovered: boolean;
  max: number;
  /** Draw the empty places. Only while a tile is looking for somewhere to go. */
  showSlots: boolean;
  zone: DropZoneBinding;
  onRemove: (id: string, index: number) => void;
}) {
  const left = laneLeft(track);
  return (
    <View
      ref={attach}
      onLayout={onLayout}
      accessibilityLabel={`Track ${track}: ${items.length} of ${max} places taken`}
      style={{
        position: "absolute",
        left,
        top: laneTop(track),
        width: Math.max(0, width - left),
        height: BOARD.laneHeight,
        // Both tracks queue from the same x, and neither runs into the buffer stop.
        paddingLeft: slotsLeft() - left,
        paddingRight: BOARD.terminus,
      }}
      className={cn(
        "flex-row items-end gap-xs rounded-sm border-hairline border-dashed py-xs transition-colors duration-fast",
        hovered ? "border-thick border-ring bg-muted" : "border-transparent",
      )}
    >
      {/*
        What is standing here sizes to its own name — a five-wide grid made "Your
        Dog" two thirds empty box — and what is not yet standing here shares out
        whatever is left. A chip therefore never moves when the empty places
        appear under a dragged tile.
      */}
      {items.map((item, index) => (
        <ObjectChip key={index} item={item} onRemove={() => onRemove(item.id, index)} />
      ))}
      {showSlots
        ? Array.from({ length: Math.max(0, max - items.length) }, (_, index) => (
            // The empty place: an outline standing where an object would stand.
            // It only appears while a tile is in the air, so at rest the board is
            // a drawing of two tracks rather than ten dashed boxes over one.
            <View
              key={`slot-${index}`}
              style={{ height: BOARD.slotHeight }}
              className="flex-1 rounded-sm border-hairline border-dashed border-border"
            />
          ))
        : null}
    </View>
  );
}

export type TrackBoardProps = {
  track1: readonly TrolleyObject[];
  track2: readonly TrolleyObject[];
  /** Removes the object at `index` on `track`; the same object may appear twice. */
  onRemove: (track: TrackId, index: number) => void;
  /** The drop zones the palette's drag gesture hit-tests against. */
  zones: UseDropZones<TrackZoneId>;
  /** The track currently under a dragged tile, if any. */
  hovered?: TrackId | null;
  /**
   * A tile is looking for a track: a drag is under way, or one was tapped and is
   * waiting to be told where to go. The empty places are drawn while it is true.
   */
  arming?: boolean;
  /** How many objects a track holds before it stops accepting more. */
  max: number;
  /** The trolley, drawn over the rails once the board's width is known. */
  overlay?: (width: number) => ReactNode;
  className?: string;
};

/**
 * The board: two tracks, a junction, and whatever has been put in the way.
 *
 * The rails are one SVG sized to the measured width, and the lanes are ordinary
 * views laid over it — so a chip is a real, pressable, wrapping element rather
 * than something drawn into the picture, while the picture underneath stays a
 * single coherent drawing.
 */
export function TrackBoard({
  track1,
  track2,
  onRemove,
  zones,
  hovered = null,
  arming = false,
  max,
  overlay,
  className,
}: TrackBoardProps) {
  const theme = useTheme();
  const [width, setWidth] = useState<number>(BOARD.minWidth);
  /** The pointer is over the board, which is the other way to ask where things go. */
  const [pointerOver, setPointerOver] = useState(false);
  const showSlots = arming || pointerOver || hovered !== null;

  const measure = useCallback((event: LayoutChangeEvent) => {
    // The gutter is part of the panel but not of the drawing, so the rails are
    // laid out against whatever is left of the measured width.
    const measured = event.nativeEvent.layout.width - BOARD.gutter;
    setWidth(Math.max(BOARD.minWidth, Math.round(measured)));
  }, []);

  const lanes: { track: TrackId; items: readonly TrolleyObject[] }[] = [
    { track: 1, items: track1 },
    { track: 2, items: track2 },
  ];

  return (
    <View
      className={cn(
        "flex-row overflow-hidden rounded-lg border-hairline border-border bg-background",
        className,
      )}
      onLayout={measure}
      onPointerEnter={() => setPointerOver(true)}
      onPointerLeave={() => setPointerOver(false)}
    >
      {/* The track names live here, left of the drawing, so nothing lands on a rail. */}
      <View style={{ width: BOARD.gutter, height: BOARD.height }}>
        {lanes.map(({ track }) => (
          <View
            key={`label-${track}`}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: railY(track) - BOARD.labelHalfHeight,
            }}
            className="px-md"
          >
            {/* The label wears its own rail's hue, which is all the two hues mean. */}
            <Text variant="meta" className={track === 1 ? "text-primary" : "text-track2"}>
              {`Track ${track}`}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width, height: BOARD.height }}>
          <Rails width={width} theme={theme} />

          {lanes.map(({ track, items }) => (
            <Lane
              key={track}
              track={track}
              items={items}
              width={width}
              hovered={hovered === track}
              max={max}
              showSlots={showSlots}
              zone={zones.bind(zoneOf(track))}
              onRemove={(_id, index) => onRemove(track, index)}
            />
          ))}

          {overlay?.(width)}
        </View>
      </ScrollView>
    </View>
  );
}
