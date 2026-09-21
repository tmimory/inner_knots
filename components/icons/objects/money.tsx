import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function MoneyIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Money">
      <Path d="M5 8 H27 V21 H5 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M7.6 10.6 H24.4 V18.4 H7.6 Z" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={16} cy={14.6} r={3.4} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M16 11.6 V17.6 M17.6 12.6 H15 C13.8 12.6 13.8 14.2 15 14.2 H17 C18.2 14.2 18.2 16.6 17 16.6 H14.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M8 24 H30 V29 H8 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M10.6 26.4 H27.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
