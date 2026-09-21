import { Path } from "react-native-svg";

import { Figure, GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function GirlIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Girl">
      <Figure name="childSkirt" pen={pen} />
      <Path
        d="M12.2 9 C11.8 6.2 20.2 6.2 19.8 9 C19.6 11 20 12.6 20.6 13.6 L18.6 13.2 C19 11.6 19 9.4 18.4 8.6 H13.6 C13 9.4 13 11.6 13.4 13.2 L11.4 13.6 C12 12.6 12.4 11 12.2 9 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.hair}
      />
    </GlyphFrame>
  );
}
