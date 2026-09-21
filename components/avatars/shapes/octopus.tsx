import { Circle, Ellipse, Path } from "react-native-svg";

import { AvatarFrame, PEN, useAvatarPen, type AvatarShapeProps } from "./ink";

/** A many-armed thinker, one arm under the chin. The tint is the mantle. */
export function Octopus({ color, size }: AvatarShapeProps) {
  const pen = useAvatarPen();
  return (
    <AvatarFrame size={size} label="Octopus">
      <Path d="M20 38 C11 41 5 48 4 58" stroke={pen.ink} strokeWidth={PEN.bold} />
      <Path d="M25 41 C19 46 16 51 16 58" stroke={pen.ink} strokeWidth={PEN.bold} />
      <Path d="M34 42 C36 48 36 53 34 58" stroke={pen.ink} strokeWidth={PEN.bold} />
      <Path d="M39 41 C45 46 48 51 48 58" stroke={pen.ink} strokeWidth={PEN.bold} />
      <Path d="M44 38 C53 41 59 48 60 58" stroke={pen.ink} strokeWidth={PEN.bold} />
      <Path d="M28 41 C24 46 27 51 31 48 C34 46 33 42 31 40" stroke={pen.ink} strokeWidth={PEN.bold} />
      <Path
        d="M32 6 C22 6 16 14 16 24 C16 32 20 38 24 41 H40 C44 38 48 32 48 24 C48 14 42 6 32 6 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.bold}
      />
      <Path d="M22 39 C27 43 37 43 42 39" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Path d="M24 18 C26 16 29 16 31 18 M33 18 C35 16 38 16 40 18" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Circle cx={25} cy={26} r={4.6} fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.line} />
      <Circle cx={39} cy={26} r={4.6} fill={pen.paper} stroke={pen.ink} strokeWidth={PEN.line} />
      <Ellipse cx={25} cy={26} rx={2.6} ry={1.3} fill={pen.ink} />
      <Ellipse cx={39} cy={26} rx={2.6} ry={1.3} fill={pen.ink} />
      <Circle cx={9.6} cy={48} r={1.2} fill={pen.wash} />
      <Circle cx={6} cy={54} r={1.2} fill={pen.wash} />
      <Circle cx={54.4} cy={48} r={1.2} fill={pen.wash} />
      <Circle cx={58} cy={54} r={1.2} fill={pen.wash} />
    </AvatarFrame>
  );
}
