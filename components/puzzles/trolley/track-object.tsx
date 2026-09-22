import { Pressable, View } from "react-native";

import { Button, POPOVER_SURFACE_CLASSES, Text } from "@/components/ui";
import type { TrolleyObject } from "@/lib/puzzles/trolley/catalogue";
import { cn } from "@/lib/utils";

import { BOARD, figureTopInLane, type TrackId } from "./geometry";
import { ObjectGlyph } from "./object-glyph";

/** The name written beside a figure, or the air it would have taken. */
function Name({ label, show }: { label: string; show: boolean }) {
  return (
    <View style={{ height: BOARD.nameHeight }} className="justify-center">
      {show ? (
        <Text variant="small" numberOfLines={1} className="text-center">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export type TrackObjectProps = {
  item: TrolleyObject;
  track: TrackId;
  /** Which of the track's places this is, counted from the junction. */
  index: number;
  /** Whether the board is wide enough for the name to be worth reading. */
  showName: boolean;
  /** This figure's popover is the one that is open. */
  open: boolean;
  onPress: () => void;
};

/**
 * One object standing on a rail.
 *
 * The figure is centred on the rail's centre line, so the drawing says "this is
 * on the track" rather than "this is listed above the track", and the name is
 * written outside the pair of rails — above on track 1, below on track 2 — where
 * it never lands on the ironwork. The name band is laid out whether or not a name
 * is drawn in it, so the figure sits on the rail at every width.
 *
 * The whole slot is the target — figure and name together — so there is one
 * thing to press rather than a drawing and a smaller word beside it.
 */
export function TrackObject({ item, track, index, showName, open, onPress }: TrackObjectProps) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={`${item.label}, place ${index + 1} on track ${track}`}
      accessibilityHint="Shows its name and a way to take it off the track"
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      // One column written name-first; track 2 reads it upwards, which is the
      // whole difference between a name above the rail and a name below it.
      className={cn("flex-1", track === 1 ? "flex-col" : "flex-col-reverse")}
    >
      <Name label={item.label} show={showName} />
      <View style={{ height: BOARD.nameGap }} />
      {/*
        The state is carried by an edge around the figure alone — not by a fill,
        which would cover the very rail it stands on, and not by a box around the
        whole slot, which on a narrow board would be mostly the empty name band.
      */}
      <View
        style={{ height: BOARD.glyphSize }}
        className={cn(
          "items-center justify-center rounded-md border-hairline transition-colors duration-fast",
          open ? "border-ring" : "border-transparent web:hover:border-border",
        )}
      >
        <ObjectGlyph icon={item.icon} size={BOARD.glyphSize} />
      </View>
    </Pressable>
  );
}

/** A place on a track with nothing standing in it, drawn while a tile is in the air. */
export function EmptySlot({ track }: { track: TrackId }) {
  return (
    <View
      className="flex-1"
      style={{ paddingTop: figureTopInLane(track) }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={{ height: BOARD.glyphSize, width: BOARD.glyphSize }}
        className="self-center rounded-md border-hairline border-dashed border-border"
      />
    </View>
  );
}

export type TrackObjectPopoverProps = {
  item: TrolleyObject;
  track: TrackId;
  onRemove: () => void;
};

/**
 * What a figure says when it is pressed: its full name, and the way off the track.
 *
 * It is the one removal gesture at every width — a "×" riding on the name would
 * disappear with the name on a narrow board, leaving a placed object with no way
 * back off it. A row rather than a stack, because the gap between the two tracks
 * is the only room it has.
 */
export function TrackObjectPopover({ item, track, onRemove }: TrackObjectPopoverProps) {
  return (
    <View
      className={cn(
        POPOVER_SURFACE_CLASSES,
        "max-w-menu flex-row items-center gap-md rounded-md px-md py-sm shadow-ink-lifted",
      )}
    >
      <Text variant="small" numberOfLines={2} className="shrink text-popover-foreground">
        {item.label}
      </Text>
      <Button
        size="sm"
        variant="destructive"
        accessibilityLabel={`Take ${item.label} off track ${track}`}
        onPress={onRemove}
      >
        <Text>Remove</Text>
      </Button>
    </View>
  );
}
