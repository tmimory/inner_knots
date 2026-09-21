import { Ellipse, Path } from "react-native-svg";

import { AvatarFrame, PEN, useAvatarPen, type AvatarShapeProps } from "./ink";

/** A Greek vase, painted once and argued over since. The tint is the glaze band. */
export function Amphora({ color, size }: AvatarShapeProps) {
  const pen = useAvatarPen();
  return (
    <AvatarFrame size={size} label="Amphora">
      <Path d="M22 18 C13 20 12 29 17 34" stroke={pen.ink} strokeWidth={PEN.bold} />
      <Path d="M42 18 C51 20 52 29 47 34" stroke={pen.ink} strokeWidth={PEN.bold} />
      <Path
        d="M26 9 H38 L38 17 C47 21 49 31 47 39 C45 48 39 53 36 53 L37 58 H27 L28 53 C25 53 19 48 17 39 C15 31 17 21 26 17 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={PEN.bold}
      />
      <Path
        d="M16.6 31 C16.2 35 16.6 40 17.8 44 C25 47 39 47 46.2 44 C47.4 40 47.8 35 47.4 31 C40 35 24 35 16.6 31 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.hair}
      />
      <Path d="M22 36 V43 M28 35 V45 M36 35 V45 M42 36 V43" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Ellipse cx={32} cy={9} rx={8} ry={2.6} fill={pen.shade} stroke={pen.ink} strokeWidth={PEN.line} />
      <Path d="M27 58 H37" stroke={pen.ink} strokeWidth={PEN.line} />
    </AvatarFrame>
  );
}
