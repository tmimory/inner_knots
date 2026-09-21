import { Path } from "react-native-svg";

import { Figure, GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function ManIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Man">
      <Figure name="man" pen={pen} />
      <Path d="M11.8 6 C13 4 19 4 20.2 6" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M16 20 V29" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
