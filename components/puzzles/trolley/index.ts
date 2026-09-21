/** Barrel for the trolley screen's parts. Import from `@/components/puzzles/trolley`. */
export { DraggableObject, type DragPoint, type DraggableObjectProps } from "./draggable-object";
export { BOARD, PALETTE, TROLLEY, travel, type TrackId } from "./geometry";
export { ObjectCreator, type ObjectCreatorProps } from "./object-creator";
export { ObjectGlyph, type ObjectGlyphProps } from "./object-glyph";
export { ObjectPalette, type ObjectPaletteProps } from "./object-palette";
export { TrolleyResults, type TrolleyResultsProps } from "./results";
export {
  TRACK_ZONE_IDS,
  TrackBoard,
  trackOf,
  zoneOf,
  type TrackBoardProps,
  type TrackZoneId,
} from "./track-board";
export { TrolleyAnimation, TrolleyGlyph, type TrolleyAnimationProps } from "./trolley-animation";
export { useDropZones, type UseDropZones } from "./use-drop-zones";
