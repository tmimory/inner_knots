import { Circle, Path } from "react-native-svg";

import { AvatarFrame, PEN, useAvatarPen, type AvatarShapeProps } from "./ink";

/** Zeno's hare, mid-stride and still losing. The tint is the fur. */
export function Hare({ color, size }: AvatarShapeProps) {
  const pen = useAvatarPen();
  return (
    <AvatarFrame size={size} label="Hare">
      <Path
        d="M42 26 C39 17 40 6 44 6 C48 6 48 19 47 27 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M48 27 C49 19 53 9 56 11 C59 14 55 23 53 29 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path d="M11 39 C6 37 5 42 10 44" fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.line} />
      <Path
        d="M26 30 C17 30 10 36 10 43 C10 50 17 55 26 55 C34 55 41 51 43 44 C44 40 42 36 38 34 C34 32 30 30 26 30 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.bold}
      />
      <Path
        d="M14 50 C11 54 14 58 19 58 H28"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path d="M24 34 C16 37 14 47 20 53" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M38 48 L40 58 M31 51 L32 58" stroke={pen.ink} strokeWidth={PEN.line} />
      <Path
        d="M44 24 C39 24 36 28 37 33 C38 38 43 40 48 38 C53 36 56 30 53 26 C51 24 47 24 44 24 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.bold}
      />
      <Circle cx={45} cy={30.5} r={1.6} fill={pen.ink} />
      <Path d="M52.6 33 C54 33 55 32.4 55.4 31.4" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M51 30 L60 27 M52 35 L61 37" stroke={pen.wash} strokeWidth={PEN.hair} />
    </AvatarFrame>
  );
}
