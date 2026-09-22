import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { LayoutChangeEvent, Pressable, ScrollView, View } from "react-native";
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
  showsNames,
  slotWidth,
  slotX,
  slotsLeft,
  straightRail,
  tieXs,
  type TrackId,
} from "./geometry";
import { EmptySlot, TrackObject, TrackObjectPopover } from "./track-object";
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

/** Which figure's popover is open, if any. */
type OpenSlot = { track: TrackId; index: number };

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
 * The band is a fixed row of `max` equal slots rather than a wrapping bag of
 * chips: a thing on a track occupies a place, every place is the same size, and
 * an empty track still shows how many things it will take and where each one will
 * stand — the capacity is drawn rather than written under the board. The places
 * take their width straight from `slotWidth`, so the same arithmetic that lays
 * them out is the one the popover is anchored by.
 *
 * The band covers the rail and the line of names either side of it, so the drop
 * zone is the whole visible track rather than a strip above it.
 */
function Lane({
  track,
  items,
  width,
  hovered,
  max,
  showSlots,
  showNames,
  openIndex,
  onToggle,
  zone: { attach, onLayout },
}: {
  track: TrackId;
  items: readonly TrolleyObject[];
  width: number;
  hovered: boolean;
  max: number;
  /** Draw the empty places. Only while a tile is looking for somewhere to go. */
  showSlots: boolean;
  /** The board is wide enough that a name is worth the line it costs. */
  showNames: boolean;
  /** Which of this track's places has its popover open. */
  openIndex: number | null;
  onToggle: (index: number) => void;
  zone: DropZoneBinding;
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
        // An edge rather than a fill: a tinted band would cover the very rails the
        // track is made of.
        "flex-row items-stretch rounded-sm border-hairline border-dashed transition-colors duration-fast",
        hovered ? "border-thick border-ring" : "border-transparent",
      )}
    >
      {/*
        The places are sized from `slotWidth` rather than shared out by `flex-1`,
        so the width a slot has and the width the popover is anchored against are
        one calculation instead of two that have to be kept saying the same thing.
      */}
      {Array.from({ length: max }, (_, index) => {
        const item = items[index];
        return (
          <View
            key={index}
            style={{
              width: slotWidth(width, max),
              marginLeft: index === 0 ? 0 : BOARD.slotGap,
            }}
          >
            {item ? (
              <TrackObject
                item={item}
                track={track}
                index={index}
                showName={showNames}
                open={openIndex === index}
                onPress={() => onToggle(index)}
              />
            ) : showSlots ? (
              // The empty place: an outline standing where an object would stand.
              // It only appears while a tile is in the air, so at rest the board
              // is a drawing of two tracks rather than ten dashed boxes over one.
              <EmptySlot track={track} />
            ) : null}
          </View>
        );
      })}
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
 * views laid over it — so a figure standing on a rail is a real, pressable
 * element rather than something drawn into the picture, while the picture
 * underneath stays a single coherent drawing.
 *
 * One popover at a time, held here rather than in the figure that opened it: it
 * has to be laid out against the board's own box to clear the other track, and
 * only the board knows that two figures cannot both be talking.
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
  const [open, setOpen] = useState<OpenSlot | null>(null);
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

  const showNames = showsNames(width, max);
  /** The object the open popover belongs to; a removal underneath it closes it. */
  const openItem = open ? (open.track === 1 ? track1 : track2)[open.index] : undefined;

  const toggle = useCallback((track: TrackId, index: number) => {
    setOpen((current) =>
      current && current.track === track && current.index === index ? null : { track, index },
    );
  }, []);

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
              showNames={showNames}
              openIndex={open?.track === track ? open.index : null}
              onToggle={(index) => toggle(track, index)}
              zone={zones.bind(zoneOf(track))}
            />
          ))}

          {open && openItem ? (
            <>
              {/* Anywhere else on the board dismisses it. */}
              <Pressable
                role="button"
                accessibilityLabel="Close"
                onPress={() => setOpen(null)}
                style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
              />
              <View style={{ position: "absolute", zIndex: theme.zIndex.menu, ...anchor(open, width, max) }}>
                <TrackObjectPopover
                  item={openItem}
                  track={open.track}
                  onRemove={() => {
                    setOpen(null);
                    onRemove(open.track, open.index);
                  }}
                />
              </View>
            </>
          ) : null}

          {overlay?.(width)}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Where the popover hangs: in the gap between the two tracks, under the figure it
 * belongs to on track 1 and over it on track 2, so it never covers a name.
 *
 * It is pinned by its right edge once its widest form would run past the buffer
 * stop — the board clips at its own rounded border, and a popover cut in half by
 * the panel edge is worse than one that opens leftwards.
 */
function anchor(
  open: OpenSlot,
  width: number,
  max: number,
): { left?: number; right?: number; top?: number; bottom?: number } {
  const x = slotX(width, max, open.index);
  const flipped = x + BOARD.popoverMaxWidth > railEnd(width);
  return {
    ...(flipped ? { right: Math.max(0, width - (x + slotWidth(width, max))) } : { left: x }),
    ...(open.track === 1
      ? { top: laneTop(1) + BOARD.laneHeight + BOARD.nameGap }
      : { bottom: BOARD.height - laneTop(2) + BOARD.nameGap }),
  };
}
