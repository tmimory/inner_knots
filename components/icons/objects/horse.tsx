import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, Legs, useGlyphPen, type ObjectIconProps } from "./glyph";

export function HorseIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Horse">
      <Path d="M4 17 C1.6 20 2 25 4.6 27" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Legs xs={[7, 11, 17, 21]} top={26} bottom={30} pen={pen} />
      <Path
        d="M9 15 C6 15 4 17 4 20 V23 C4 25 5.6 26 7.6 26 H19 C21.6 26 23.4 24.4 23.4 21.6 V18 C23.4 16 21.6 15 19 15 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path
        d="M18 19.4 C19.4 14.6 22 10.6 24.6 8 L29 11.4 C26.6 13.6 24.6 16.4 23.4 19.6 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path
        d="M24.4 8.6 C23.4 6 25 3.4 27 3.4 C29.2 3.4 30.8 5.4 30.8 7.6 C30.8 9.8 29.8 11.8 28.4 13 C27 14 25.4 12.6 24.6 11 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M26 3.8 L25.8 1.2 L28 3.2 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M19.6 16.6 C21.6 12.6 23.6 9.6 25.6 7.4" stroke={pen.wash} strokeWidth={GLYPH_PEN.line} />
      <Path d="M28.6 11.6 C29.4 12 30 11.6 30.2 11" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={27.4} cy={7.4} r={0.9} fill={pen.ink} />
    </GlyphFrame>
  );
}
