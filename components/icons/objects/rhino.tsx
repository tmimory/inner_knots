import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, Legs, useGlyphPen, type ObjectIconProps } from "./glyph";

export function RhinoIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Rhinoceros">
      <Path d="M3.6 16.6 L1.4 15" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Legs xs={[7, 11, 17, 21]} top={26.6} bottom={30} pen={pen} />
      <Path
        d="M9 14 C5.6 14 3.4 16.6 3.4 20 V23 C3.4 25.4 5.4 26.6 8 26.6 H20 C23 26.6 25 24.6 25 21.6 V18 C25 15.6 23 14 20 14 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path
        d="M24 16 C27 14.6 30.4 16 30.4 19.4 C30.4 22.6 27.4 24 24.6 23.4 C22.6 23 22 20.4 23 18 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M30.2 16 C31.4 12.6 29.6 10 27.2 11 C29 12.2 29.4 14 29 16.2 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M26.6 15 C26.6 13 25.4 12 24.4 12.6 C25.6 13.2 25.8 14 25.8 15.2 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M23.4 15.4 C22.2 13 20.4 13.8 21.2 16 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M9 15.4 C13 13.6 19 13.6 23 15.4" stroke={pen.wash} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={25.6} cy={18.4} r={0.9} fill={pen.ink} />
    </GlyphFrame>
  );
}
