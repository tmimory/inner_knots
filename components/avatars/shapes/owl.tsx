import { Circle, Path } from "react-native-svg";

import { AvatarFrame, PEN, useAvatarPen, type AvatarShapeProps } from "./ink";

/** Athena's owl, all eyes. The tint is the breast feathers. */
export function Owl({ color, size }: AvatarShapeProps) {
  const pen = useAvatarPen();
  return (
    <AvatarFrame size={size} label="Owl">
      <Path d="M15 17 L11 6 L22 12 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.line} />
      <Path d="M49 17 L53 6 L42 12 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.line} />
      <Path
        d="M32 8 C19 8 11 19 11 33 C11 48 20 57 32 57 C44 57 53 48 53 33 C53 19 45 8 32 8 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={PEN.bold}
      />
      <Path
        d="M32 31 C24 35 21 43 22 52 C25 55 28 57 32 57 C36 57 39 55 42 52 C43 43 40 35 32 31 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path d="M26 43 C29 40 35 40 38 43" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M26 49 C29 46 35 46 38 49" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M13 30 C12 41 16 49 21 54" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M51 30 C52 41 48 49 43 54" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Circle cx={23} cy={25} r={8} fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.line} />
      <Circle cx={41} cy={25} r={8} fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.line} />
      <Circle cx={23} cy={25} r={3.4} fill={pen.ink} />
      <Circle cx={41} cy={25} r={3.4} fill={pen.ink} />
      <Circle cx={24.6} cy={23.4} r={1} fill={pen.paper} />
      <Circle cx={42.6} cy={23.4} r={1} fill={pen.paper} />
      <Path d="M32 26 L28 32 L32 36 L36 32 Z" fill={pen.wash} stroke={pen.ink} strokeWidth={PEN.line} />
    </AvatarFrame>
  );
}
