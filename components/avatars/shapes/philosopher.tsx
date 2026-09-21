import { Circle, Path } from "react-native-svg";

import { AvatarFrame, PEN, useAvatarPen, type AvatarShapeProps } from "./ink";

/** A bearded figure in a chiton. The tint is the chiton. */
export function Philosopher({ color, size }: AvatarShapeProps) {
  const pen = useAvatarPen();
  return (
    <AvatarFrame size={size} label="Philosopher">
      <Path
        d="M32 30 C24 30 19 33 17 38 L14 58 H50 L47 38 C45 33 40 30 32 30 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.bold}
      />
      <Path d="M24 37 L21 58 M40 37 L43 58" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M27 41 C31 45 35 44 37 40" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Circle cx={32} cy={20} r={9.6} fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.bold} />
      <Path
        d="M23 22 C23 31 25 40 32 43 C39 40 41 31 41 22 C39 28 36 30.5 32 30.5 C28 30.5 25 28 23 22 Z"
        fill={pen.wash}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M22.6 20 C21 8 43 8 41.4 20 C40 14 24 14 22.6 20 Z"
        fill={pen.wash}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M27 25.5 C29 24.5 31 25 32 26 C33 25 35 24.5 37 25.5 C35 28 33 28 32 27 C31 28 29 28 27 25.5 Z"
        fill={pen.wash}
        stroke={pen.ink}
        strokeWidth={PEN.hair}
      />
      <Circle cx={28} cy={21} r={1.4} fill={pen.ink} />
      <Circle cx={36} cy={21} r={1.4} fill={pen.ink} />
      <Path d="M25 17.6 C26.4 16 29.6 16 30.6 17.6" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M33.4 17.6 C34.4 16 37.6 16 39 17.6" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M32 21 V24.4 C31 25 30.4 24.8 30 24.4" stroke={pen.ink} strokeWidth={PEN.hair} />
    </AvatarFrame>
  );
}
