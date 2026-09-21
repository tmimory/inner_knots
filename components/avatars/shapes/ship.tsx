import { Circle, Path } from "react-native-svg";

import { AvatarFrame, PEN, useAvatarPen, type AvatarShapeProps } from "./ink";

/** The ship of Theseus, plank by plank. The tint is the hull. */
export function Ship({ color, size }: AvatarShapeProps) {
  const pen = useAvatarPen();
  return (
    <AvatarFrame size={size} label="Ship">
      <Path d="M32 36 V10" stroke={pen.ink} strokeWidth={PEN.line} />
      <Path d="M16 13 H48" stroke={pen.ink} strokeWidth={PEN.line} />
      <Path
        d="M18 13 C28 11 38 11 46 13 L48 31 C38 29 26 29 16 31 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path d="M23 13 V30 M32 12 V29 M41 13 V30" stroke={pen.wash} strokeWidth={PEN.hair} />
      <Path d="M17 44 L12 57 M26 48 L23 58 M38 48 L41 58 M47 44 L52 57" stroke={pen.wash} strokeWidth={PEN.line} />
      <Path
        d="M56 36 C60 33 61 27 59 23 C57 28 55 32 51 35 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M8 36 C4 33 3 27 5 23 C7 28 9 32 13 35 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M7 35 H57 C55 46 46 52 32 52 C18 52 9 46 7 35 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.bold}
      />
      <Path d="M9 40 H55" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Circle cx={48} cy={41} r={2.6} fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.hair} />
      <Circle cx={48} cy={41} r={1} fill={pen.ink} />
    </AvatarFrame>
  );
}
