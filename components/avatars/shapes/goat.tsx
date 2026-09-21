import { Circle, Ellipse, Path } from "react-native-svg";

import { AvatarFrame, PEN, useAvatarPen, type AvatarShapeProps } from "./ink";

/** The goat that ate the scroll, unrepentant. The tint is the coat. */
export function Goat({ color, size }: AvatarShapeProps) {
  const pen = useAvatarPen();
  return (
    <AvatarFrame size={size} label="Goat">
      <Path
        d="M26 19 C24 12 19 6 15 8 C18 10 21 15 23 21 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M38 19 C40 12 45 6 49 8 C46 10 43 15 41 21 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M21 28 C16 27 12 30 14 33 C17 35 21 33 22.5 30.5 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M43 28 C48 27 52 30 50 33 C47 35 43 33 41.5 30.5 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path
        d="M32 18 C25 18 21 23 21 30 C21 36 24 43 28 47 C30 49 34 49 36 47 C40 43 43 36 43 30 C43 23 39 18 32 18 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.bold}
      />
      <Path
        d="M29 46 C28 52 30 58 32 58 C34 58 36 52 35 46 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Ellipse cx={26.5} cy={30} rx={2.2} ry={1.5} fill={pen.ink} />
      <Ellipse cx={37.5} cy={30} rx={2.2} ry={1.5} fill={pen.ink} />
      <Circle cx={30} cy={41} r={1.1} fill={pen.ink} />
      <Circle cx={34} cy={41} r={1.1} fill={pen.ink} />
      <Path d="M30 44.4 C31 45.4 33 45.4 34 44.4" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path
        d="M38 43 L55 38 L57 44 L40 49 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path d="M43 45 L52 42" stroke={pen.wash} strokeWidth={PEN.hair} />
      <Circle cx={56} cy={41} r={3.4} fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.line} />
      <Circle cx={39} cy={46} r={3} fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.line} />
    </AvatarFrame>
  );
}
