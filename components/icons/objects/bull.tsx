import { Circle, Ellipse, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, Legs, useGlyphPen, type ObjectIconProps } from "./glyph";

export function BullIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Bull">
      <Path d="M3.6 14.6 C1 16.6 1.4 22 3.6 24.6" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Legs xs={[7, 11, 18, 22]} top={25} bottom={30} pen={pen} />
      <Path d="M23.4 14.4 C21 10.4 24.6 7.6 26.4 11.6" stroke={pen.ink} strokeWidth={GLYPH_PEN.bold} />
      <Path d="M30.4 14.6 C31.6 10.6 28.4 8.6 27.4 11.6" stroke={pen.ink} strokeWidth={GLYPH_PEN.bold} />
      <Path
        d="M9 12.6 C6 12.6 3.6 15 3.6 18.4 V22 C3.6 24 5.4 25 7.6 25 H21 C23.6 25 25.4 23.4 25.4 20.6 V17.6 C25.4 14.6 23.6 12.6 21 12.6 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M8.6 13 C11 9.6 16 9.6 18.6 12.4" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path
        d="M23 15 C26 13.4 30 14.4 30.6 17.4 C31 20.4 28.6 22.6 25.6 22 C23.4 21.6 22.4 19.6 23 17 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Ellipse cx={28.6} cy={20} rx={2.6} ry={2} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={28.6} cy={22.4} r={1.6} fill="none" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={26.4} cy={16.6} r={0.9} fill={pen.ink} />
    </GlyphFrame>
  );
}
