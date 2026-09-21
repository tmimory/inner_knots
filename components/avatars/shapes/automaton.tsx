import { Circle, Path, Rect } from "react-native-svg";

import { AvatarFrame, PEN, useAvatarPen, type AvatarShapeProps } from "./ink";

/** A bronze Talos head, riveted shut. The tint is the faceplate. */
export function Automaton({ color, size }: AvatarShapeProps) {
  const pen = useAvatarPen();
  return (
    <AvatarFrame size={size} label="Automaton">
      <Path d="M22 11 C26 2 38 2 42 11 Z" fill={pen.shade} stroke={pen.ink} strokeWidth={PEN.line} />
      <Circle cx={32} cy={4} r={2.2} fill={pen.shade} stroke={pen.ink} strokeWidth={PEN.hair} />
      <Circle cx={12} cy={34} r={3.6} fill={pen.shade} stroke={pen.ink} strokeWidth={PEN.line} />
      <Circle cx={52} cy={34} r={3.6} fill={pen.shade} stroke={pen.ink} strokeWidth={PEN.line} />
      <Path
        d="M32 8 C20 8 14 16 14 28 V44 C14 52 21 58 32 58 C43 58 50 52 50 44 V28 C50 16 44 8 32 8 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={PEN.bold}
      />
      <Path
        d="M20 22 H44 V46 C44 50 39 52 32 52 C25 52 20 50 20 46 Z"
        fill={color}
        stroke={pen.ink}
        strokeWidth={PEN.line}
      />
      <Path d="M17 20 H47" stroke={pen.ink} strokeWidth={PEN.line} />
      <Rect x={23} y={27} width={8} height={4} rx={2} fill={pen.ink} />
      <Rect x={33} y={27} width={8} height={4} rx={2} fill={pen.ink} />
      <Path d="M24 38 H40 V45 H24 Z" stroke={pen.ink} strokeWidth={PEN.line} />
      <Path d="M28 38 V45 M32 38 V45 M36 38 V45" stroke={pen.ink} strokeWidth={PEN.hair} />
      <Circle cx={18} cy={26} r={1.4} fill={pen.ink} />
      <Circle cx={46} cy={26} r={1.4} fill={pen.ink} />
      <Circle cx={18} cy={45} r={1.4} fill={pen.ink} />
      <Circle cx={46} cy={45} r={1.4} fill={pen.ink} />
    </AvatarFrame>
  );
}
