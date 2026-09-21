import { Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function ScrollIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Scroll">
      <Path d="M9 6 H23 V26 H9 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M12 11 H20 M12 15 H20 M12 19 H17.6" stroke={pen.wash} strokeWidth={GLYPH_PEN.hair} />
      <Path
        d="M9 3 C6 3 4.6 4.4 4.6 6 C4.6 7.6 6 9 9 9 C7.6 8.4 7 7.4 7 6 C7 4.6 7.6 3.6 9 3 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M9 3 H23 C26 3 27.4 4.4 27.4 6 C27.4 7.6 26 9 23 9 H9" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path
        d="M23 23 C26 23 27.4 24.4 27.4 26 C27.4 27.6 26 29 23 29 H9 C6 29 4.6 27.6 4.6 26 C4.6 24.4 6 23 9 23"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M23 23 C21.6 23.6 21 24.6 21 26 C21 27.4 21.6 28.4 23 29" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
