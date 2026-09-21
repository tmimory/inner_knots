import { Circle, Ellipse, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, Legs, useGlyphPen, type ObjectIconProps } from "./glyph";

export function CalfIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Calf">
      <Path d="M6.6 18 C4.6 19.4 4.6 23 6.4 24.6" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Legs xs={[9.6, 12.6, 17.6, 20.6]} top={25} bottom={29.6} pen={pen} />
      <Path
        d="M11.6 15.6 C9 15.6 7 17.6 7 20.4 V22.4 C7 24.2 8.6 25 10.4 25 H19.6 C21.8 25 23.4 23.6 23.4 21.4 V19 C23.4 17 21.8 15.6 19.6 15.6 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path
        d="M21.4 16.6 C24 15.4 27.4 16.4 28 19 C28.4 21.6 26.4 23.4 23.8 23 C21.8 22.6 21 20.6 21.6 18.4 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M22.6 15.6 C21.6 13.4 23.6 12.4 24.4 14.6" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M27 15.8 C27.8 13.8 28.6 15 28 16.6" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Ellipse cx={26.4} cy={21} rx={2.2} ry={1.8} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={24.4} cy={18.4} r={0.8} fill={pen.ink} />
      <Path d="M11.6 18.4 C13.6 17.6 14.6 19.6 13.6 21 C12.4 22.4 10.6 20.6 11.6 18.4 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
