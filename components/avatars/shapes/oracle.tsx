import { Circle, Path } from "react-native-svg";

import { AvatarFrame, PEN, useAvatarPen, type AvatarShapeProps } from "./ink";

/** A hooded figure over a smoking tripod. The tint is the hood. */
export function Oracle({ color, size }: AvatarShapeProps) {
  const pen = useAvatarPen();
  return (
    <AvatarFrame size={size} label="Oracle">
      <Path
        d="M34 7 C24 7 18 16 18 27 C18 37 17 48 15 58 H53 C51 48 50 37 50 27 C50 16 44 7 34 7 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.bold}
      />
      <Path d="M23 33 C22 43 21 51 20 58" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M45 33 C46 43 47 51 48 58" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M27 42 C31 45 37 45 41 42" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path
        d="M26 21 C26 14 29 10 34 10 C39 10 42 14 42 21 C42 28 39 32 34 32 C29 32 26 28 26 21 Z"
        fill={pen.shade}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Circle cx={30} cy={21} r={1.5} fill={pen.ink} />
      <Circle cx={38} cy={21} r={1.5} fill={pen.ink} />
      <Path d="M13 44 C9 40 15 36 12 31 C9 27 14 23 12 19" stroke={pen.wash} strokeWidth={PEN.line} />
      <Path d="M6 46 H21 L18 51 H9 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.line} />
      <Path d="M10 51 L7 58 M17 51 L20 58 M13.5 51 V58" stroke={pen.ink} strokeWidth={PEN.line} />
    </AvatarFrame>
  );
}
