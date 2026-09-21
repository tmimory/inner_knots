import { Circle, Ellipse, Path } from "react-native-svg";

import { AvatarFrame, PEN, useAvatarPen, type AvatarShapeProps } from "./ink";

/** Zeno's tortoise, comfortably ahead. The tint is the shell. */
export function Tortoise({ color, size }: AvatarShapeProps) {
  const pen = useAvatarPen();
  return (
    <AvatarFrame size={size} label="Tortoise">
      <Path d="M12 42 C9 43 7 45 6 48" stroke={pen.ink} strokeWidth={PEN.line} />
      <Ellipse cx={54} cy={37} rx={7} ry={5} fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.bold} />
      <Path
        d="M18 42 C15 46 16 51 20 51 C24 51 25 47 24 42 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M39 42 C37 47 38 51 42 51 C46 51 47 46 44 42 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M11 43 C11 28 20 19 32 19 C44 19 53 28 53 43 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.bold}
      />
      <Path
        d="M26 27 H38 L42 34 L38 41 H26 L22 34 Z"
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path d="M26 27 L22 21 M38 27 L42 21 M42 34 H51 M22 34 H13 M26 41 L24 43 M38 41 L40 43" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Circle cx={56} cy={35} r={1.3} fill={pen.ink} />
      <Path d="M58 39 C59 40 60 40 61 39" stroke={pen.ink} strokeWidth={PEN.hair} />
    </AvatarFrame>
  );
}
