import { Circle, Path } from "react-native-svg";

import { AvatarFrame, PEN, useAvatarPen, type AvatarShapeProps } from "./ink";

/** A stout hen with opinions. The tint is the plumage. */
export function Chicken({ color, size }: AvatarShapeProps) {
  const pen = useAvatarPen();
  return (
    <AvatarFrame size={size} label="Chicken">
      <Path
        d="M48 39 C55 35 59 26 56 17 C53 25 50 30 46 33 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M51 44 C59 42 62 34 60 26 C57 33 53 37 48 39 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M27 12 C21 12 18 16 18 21 C18 24 19 26 20 27 C14 30 11 36 11 42 C11 50 19 56 29 56 C41 56 50 50 50 41 C50 31 42 25 34 24 C35 22 35 20 34 18 C33 14 30 12 27 12 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.bold}
      />
      <Path
        d="M19.6 13.4 C20 8 22.6 10 23.6 5 C25.4 9.4 27.6 7 28.6 10.6 C29.4 13 29 14.6 29 14.6 C26.4 12.6 22 12.6 19.6 13.4 Z"
        fill={pen.wash}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path d="M19 17.4 L9 21 L19 24.6 Z" fill={pen.wash} stroke={pen.ink} strokeWidth={PEN.line} />
      <Path
        d="M19.4 24.4 C16.4 27 18.4 31 21.4 29.4 Z"
        fill={pen.wash}
        stroke={pen.ink}
        strokeWidth={PEN.hair}
      />
      <Circle cx={25} cy={18} r={1.4} fill={pen.ink} />
      <Path
        d="M25 35 C31 31 41 33 44 40 C40 45 29 45 25 35 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path d="M29 40 C33 38 38 38 41.6 40" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M25 56 V60 M21 60 H30" stroke={pen.ink} strokeWidth={PEN.line} />
      <Path d="M37 55 V60 M33 60 H42" stroke={pen.ink} strokeWidth={PEN.line} />
    </AvatarFrame>
  );
}
