import { useMemo } from "react";
import { Path } from "react-native-svg";

import { AvatarFrame, PEN, useAvatarPen, type AvatarShapeProps } from "./ink";

/** Where the laurel hangs: points along the drape, left tip to right tip. */
const LAUREL_ARC: readonly (readonly [number, number])[] = [
  [11, 18],
  [12.6, 27.2],
  [17.2, 35],
  [24, 40.2],
  [32, 42],
  [40, 40.2],
  [46.8, 35],
  [51.4, 27.2],
  [53, 18],
];

/** The point every leaf points away from. */
const LAUREL_ORIGIN: readonly [number, number] = [32, 18];
const LEAF_LENGTH = 6;
const LEAF_ROOT = 1.6;
const LEAF_WIDTH = 2.6;

/** A lens-shaped leaf straddling `point`, pointing away from the wreath's origin. */
function leafPath([x, y]: readonly [number, number]): string {
  const dx = x - LAUREL_ORIGIN[0];
  const dy = y - LAUREL_ORIGIN[1];
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const bx = x - ux * LEAF_ROOT;
  const by = y - uy * LEAF_ROOT;
  const tx = x + ux * LEAF_LENGTH;
  const ty = y + uy * LEAF_LENGTH;
  const mx = (bx + tx) / 2;
  const my = (by + ty) / 2;
  const px = -uy * LEAF_WIDTH;
  const py = ux * LEAF_WIDTH;
  return `M${bx} ${by} Q${mx + px} ${my + py} ${tx} ${ty} Q${mx - px} ${my - py} ${bx} ${by} Z`;
}

/** An Ionic capital with a laurel draped over it. The tint is the wreath. */
export function Column({ color, size }: AvatarShapeProps) {
  const pen = useAvatarPen();
  const leaves = useMemo(() => LAUREL_ARC.map((point) => leafPath(point)), []);

  return (
    <AvatarFrame size={size} label="Column">
      <Path d="M23 32 H41 L39 58 H25 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.bold} />
      <Path d="M28 33 V57 M32 33 V57 M36 33 V57" stroke={pen.wash} strokeWidth={PEN.hair} />
      <Path d="M20 26 H44 L42 33 H22 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.line} />
      <Path d="M14 15 H50 V21 H14 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.bold} />
      <Path
        d="M20 21 C14 21 11 25 13 28 C15 31 20 30 20 27 C20 25 18 24 17 25"
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M44 21 C50 21 53 25 51 28 C49 31 44 30 44 27 C44 25 46 24 47 25"
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M11 18 C12 34 20 42 32 42 C44 42 52 34 53 18"
        stroke={color}
        strokeWidth={PEN.line}
      />
      {leaves.map((d) => (
        <Path key={d} d={d} fill={color} stroke={pen.ink} strokeWidth={PEN.hair} />
      ))}
      <Path d="M30 44 C28 47 29 50 31 48 M34 44 C36 47 35 50 33 48" stroke={pen.ink} strokeWidth={PEN.hair} />
    </AvatarFrame>
  );
}
