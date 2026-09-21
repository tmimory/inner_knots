import { Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function BookIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Book">
      <Path
        d="M8 4 H25 C26.6 4 27.6 5 27.6 6.6 V27 C27.6 28 26.6 28.6 25 28.6 H8 C6 28.6 4.6 27.2 4.6 25.4 V7.2 C4.6 5.4 6 4 8 4 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M9.6 4 V28.6" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M6.4 10.6 H9.6 M6.4 16 H9.6 M6.4 21.4 H9.6" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M13.6 10 H23.6 M13.6 14.6 H23.6 M13.6 19.2 H20.6" stroke={pen.wash} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M25 28.6 V25.4 C25 24.4 24 24 22.6 24 H8" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
