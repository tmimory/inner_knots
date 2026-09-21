import { Circle, Path } from "react-native-svg";

import { AvatarFrame, PEN, useAvatarPen, type AvatarShapeProps } from "./ink";

/** A moth still heading for the lamp. The tint is the wings. */
export function Moth({ color, size }: AvatarShapeProps) {
  const pen = useAvatarPen();
  return (
    <AvatarFrame size={size} label="Moth">
      <Path
        d="M31 30 C22 18 12 11 8 15 C4 20 10 30 20 34 C24 36 28 34 31 32 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M33 30 C42 18 52 11 56 15 C60 20 54 30 44 34 C40 36 36 34 33 32 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M31 34 C24 38 17 44 19 50 C21 56 29 52 32 44 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M33 34 C40 38 47 44 45 50 C43 56 35 52 32 44 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Circle cx={18} cy={24} r={3.2} fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.hair} />
      <Circle cx={46} cy={24} r={3.2} fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M11 21 C15 27 20 31 26 33 M53 21 C49 27 44 31 38 33" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M24 45 C27 43 29 44 31 47 M40 45 C37 43 35 44 33 47" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path
        d="M32 22 C29 22 28 27 28 34 C28 42 30 51 32 55 C34 51 36 42 36 34 C36 27 35 22 32 22 Z"
        fill={pen.shade}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path d="M29 31 H35 M29 37 H35 M30 43 H34" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Circle cx={32} cy={20} r={3.6} fill={pen.shade} stroke={pen.ink} strokeWidth={PEN.line} />
      <Path d="M30 18 C26 13 22 9 17 8 M34 18 C38 13 42 9 47 8" stroke={pen.ink} strokeWidth={PEN.line} />
      <Path d="M25 12 L23 9 M21 10 L19 7 M39 12 L41 9 M43 10 L45 7" stroke={pen.ink} strokeWidth={PEN.hair} />
    </AvatarFrame>
  );
}
