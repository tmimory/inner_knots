import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function BabyIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Baby">
      <Path
        d="M16 14 C10.4 14 7 18 7 22.6 C7 26.4 9.6 29 13 29 H19 C22.4 29 25 26.4 25 22.6 C25 18 21.6 14 16 14 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M9.6 20 C13 22 19 22 22.4 20" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M10 25 C13.4 26.6 18.6 26.6 22 25" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={16} cy={8.6} r={5.4} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Circle cx={13.8} cy={8.4} r={0.9} fill={pen.ink} />
      <Circle cx={18.2} cy={8.4} r={0.9} fill={pen.ink} />
      <Path d="M14.4 11 C15.4 11.8 16.6 11.8 17.6 11" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M16 3.2 C17 2 18.6 2.4 18.4 4" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
