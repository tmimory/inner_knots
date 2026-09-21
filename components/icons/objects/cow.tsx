import { Circle, Ellipse, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, Legs, useGlyphPen, type ObjectIconProps } from "./glyph";

export function CowIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Cow">
      <Path d="M4 15 C1.6 17 2 22 4 24.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Legs xs={[7, 11, 18, 22]} top={25} bottom={30} pen={pen} />
      <Path d="M24.6 13.6 C23.4 11 25.6 9.8 26.4 12.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M29.6 13.8 C30.6 11.4 31.4 12.8 30.6 14.6" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path
        d="M9 13 C6 13 4 15.4 4 18.6 V22 C4 24 5.6 25 7.6 25 H21 C23.6 25 25.4 23.4 25.4 20.6 V17 C25.4 14.6 23.6 13 21 13 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M9 25 C8 27.6 10.6 28.4 11.8 26.4" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path
        d="M23 15 C26 13.4 30 14.4 30.6 17.4 C31 20.4 28.6 22.6 25.6 22 C23.4 21.6 22.4 19.6 23 17 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M22.6 16 C20.4 15 19.8 17.6 21.8 18.6 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Ellipse cx={28.6} cy={20} rx={2.6} ry={2} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={27.8} cy={20} r={0.6} fill={pen.ink} />
      <Circle cx={29.6} cy={20} r={0.6} fill={pen.ink} />
      <Circle cx={26.4} cy={16.6} r={0.9} fill={pen.ink} />
      <Path d="M9 16 C11.6 15 13 17.6 11.6 19.4 C10 21 7.6 19 9 16 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M17 19 C19.6 18 21 20.6 19.6 22.4 C18 24 15.6 22 17 19 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
