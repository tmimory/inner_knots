import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function SculptureIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Sculpture">
      <Path d="M6 29 H26 V25.6 H8 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M11 25.6 H21 V22 H11 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path
        d="M16 11 C11.6 11 9 15 9 19.4 V22 H23 V19.4 C23 15 20.4 11 16 11 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Circle cx={16} cy={7.6} r={4.6} fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M11.6 5.6 C12.6 2.6 19.4 2.6 20.4 5.6" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M16 6.4 V8.4 C15.4 8.8 15 8.8 14.6 8.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M13 16 C14.6 17.6 17.4 17.6 19 16" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
