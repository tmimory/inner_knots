import { Path } from "react-native-svg";

import { Figure, GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function WomanIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Woman">
      <Figure name="woman" pen={pen} />
      <Path
        d="M11.6 6.4 C11.2 3.4 20.8 3.4 20.4 6.4 C19.8 9 20.6 11 21.6 12.4 L19 12 C19.8 10 19.6 7.6 18.6 6.6 H13.4 C12.4 7.6 12.2 10 13 12 L10.4 12.4 C11.4 11 12.2 9 11.6 6.4 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.hair}
      />
    </GlyphFrame>
  );
}
