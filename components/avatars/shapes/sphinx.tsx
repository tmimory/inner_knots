import { Circle, Path } from "react-native-svg";

import { AvatarFrame, PEN, useAvatarPen, type AvatarShapeProps } from "./ink";

/** A seated sphinx, holding the riddle back. The tint is the headdress. */
export function Sphinx({ color, size }: AvatarShapeProps) {
  const pen = useAvatarPen();
  return (
    <AvatarFrame size={size} label="Sphinx">
      <Path
        d="M20 35 C11 30 6 19 10 13 C15 18 18 27 23 33 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M44 35 C53 30 58 19 54 13 C49 18 46 27 41 33 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path d="M11 17 C15 22 18 27 21 31 M14 14 C17 20 20 25 23 29" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M53 17 C49 22 46 27 43 31 M50 14 C47 20 44 25 41 29" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M14 51 H28 V58 H14 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.line} />
      <Path d="M36 51 H50 V58 H36 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.line} />
      <Path d="M19 51 V58 M23.4 51 V58 M41 51 V58 M45.4 51 V58" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path
        d="M21 33 C17 38 15 45 15 52 H49 C49 45 47 38 43 33 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={PEN.bold}
      />
      <Circle cx={32} cy={20} r={10} fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.bold} />
      <Path
        d="M21 22 C20 11 25 5 32 5 C39 5 44 11 43 22 L45 37 L38 38 L37 22 H27 L26 38 L19 37 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path d="M23.4 27 H19.6 M23 31 H19 M40.6 27 H44.4 M41 31 H45" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Circle cx={29} cy={20} r={1.4} fill={pen.ink} />
      <Circle cx={35} cy={20} r={1.4} fill={pen.ink} />
      <Path d="M26.6 17 C27.6 15.6 30 15.6 31 17 M33 17 C34 15.6 36.4 15.6 37.4 17" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M30 26 C31 27 33 27 34 26" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Circle cx={32} cy={9} r={2} fill={pen.ink} />
    </AvatarFrame>
  );
}
