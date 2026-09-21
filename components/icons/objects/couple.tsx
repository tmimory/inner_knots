import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function CoupleIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Couple">
      <Path
        d="M9 14 C5.6 14 3.4 16.6 3.4 20 V29 H14.6 V20 C14.6 16.6 12.4 14 9 14 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Circle cx={9} cy={9.6} r={4} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path
        d="M23 14 C19.6 14 17.6 16.6 17.2 20 L15.8 29 H30.2 L28.8 20 C28.4 16.6 26.4 14 23 14 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Circle cx={23} cy={9.6} r={4} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M14.6 19 H17.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M16 4.6 C17 3 19 4.2 16 6.6 C13 4.2 15 3 16 4.6 Z" fill={pen.ink} />
    </GlyphFrame>
  );
}
