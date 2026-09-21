import { Path } from "react-native-svg";

import { Figure, GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function ElderManIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Elderly man">
      <Figure name="man" pen={pen} />
      <Path
        d="M12.6 9.6 C12.6 13.6 16 15.6 16 15.6 C16 15.6 19.4 13.6 19.4 9.6 C18 11.6 14 11.6 12.6 9.6 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.hair}
      />
      <Path d="M26 14 V29" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M23.6 14 C24.4 12.6 26.8 12.6 26 14.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
    </GlyphFrame>
  );
}
