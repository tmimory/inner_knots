import { Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function CrateIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Crate">
      <Path d="M4 7 H28 V27 H4 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.bold} />
      <Path d="M4 11 H28 M4 23 H28" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M4 11 L28 23 M28 11 L4 23" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M9.6 7 V27 M22.4 7 V27" stroke={pen.wash} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
