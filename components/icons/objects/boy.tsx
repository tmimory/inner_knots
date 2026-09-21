import { Path } from "react-native-svg";

import { Figure, GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function BoyIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Boy">
      <Figure name="child" pen={pen} />
      <Path d="M12.4 8.6 C13.4 6.6 18.6 6.6 19.6 8.6" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M17.6 7 L19.8 5.2" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
