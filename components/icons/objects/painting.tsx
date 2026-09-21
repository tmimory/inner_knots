import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function PaintingIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Painting">
      <Path d="M4 3 H28 V29 H4 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.bold} />
      <Path d="M7 6 H25 V26 H7 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path
        d="M16 10 C13 10 11.4 12.6 11.4 15.6 C11.4 19 13 21.4 16 21.4 C19 21.4 20.6 19 20.6 15.6 C20.6 12.6 19 10 16 10 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.hair}
      />
      <Path d="M11.6 26 C12.6 23 14 21.6 16 21.4 C18 21.6 19.4 23 20.4 26" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={14.4} cy={15} r={0.8} fill={pen.ink} />
      <Circle cx={17.6} cy={15} r={0.8} fill={pen.ink} />
      <Path d="M14.4 18 C15.4 18.8 16.6 18.8 17.6 18" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
