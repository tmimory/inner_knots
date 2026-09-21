import { Path } from "react-native-svg";

import { Figure, GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function TeenIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Teenager">
      <Figure name="teen" pen={pen} />
      <Path d="M12.4 7.4 C12 4.6 20 4.6 19.6 7.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M10.4 22 H21.6" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
