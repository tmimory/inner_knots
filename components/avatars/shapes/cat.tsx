import { Ellipse, Path } from "react-native-svg";

import { AvatarFrame, PEN, useAvatarPen, type AvatarShapeProps } from "./ink";

/** A sitting cat, tail curled, entirely unpersuaded. The tint is the fur. */
export function Cat({ color, size }: AvatarShapeProps) {
  const pen = useAvatarPen();
  return (
    <AvatarFrame size={size} label="Cat">
      <Path
        d="M42 58 C52 59 58 51 56 43 C55 38 50 36 47 39 C50 40 52 43 52 47 C52 52 48 55 42 54 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M32 21 C24 21 19 29 18 39 C17 47 19 54 21 58 H43 C45 54 47 47 46 39 C45 29 40 21 32 21 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.bold}
      />
      <Path d="M22 19 L20 7 L30 13 Z" fill={color} stroke={pen.ink} strokeWidth={PEN.line} />
      <Path d="M42 19 L44 7 L34 13 Z" fill={color} stroke={pen.ink} strokeWidth={PEN.line} />
      <Path
        d="M32 9 C25 9 21 15 21 21 C21 27 26 32 32 32 C38 32 43 27 43 21 C43 15 39 9 32 9 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.bold}
      />
      <Path d="M24 16 L23 10 L28 13 Z" fill={pen.shade} stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M40 16 L41 10 L36 13 Z" fill={pen.shade} stroke={pen.ink} strokeWidth={PEN.hair} />
      <Ellipse cx={27} cy={20} rx={2.1} ry={3} fill={pen.ink} />
      <Ellipse cx={37} cy={20} rx={2.1} ry={3} fill={pen.ink} />
      <Path d="M32 27 L30 25 H34 Z" fill={pen.ink} />
      <Path d="M32 27 V29 M32 29 C30 31 28 30 27 29 M32 29 C34 31 36 30 37 29" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M24 25 L15 23 M24 28 L15 29 M40 25 L49 23 M40 28 L49 29" stroke={pen.wash} strokeWidth={PEN.hair} />
      <Path d="M32 32 C30 39 30 47 31 53" stroke={pen.wash} strokeWidth={PEN.hair} />
      <Path d="M24 53 C24 58 29 58 29 53" fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M35 53 C35 58 40 58 40 53" fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.hair} />
    </AvatarFrame>
  );
}
