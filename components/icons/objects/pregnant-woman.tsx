import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function PregnantWomanIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Pregnant woman">
      <Path
        d="M15 13 C11.6 13 9.6 16 9.6 20 C9.6 23 10 26 10.6 29 H22 C22.6 25.6 23 22 22.6 19.6 C22.2 16 19 13 15 13 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path
        d="M21.4 17.4 C25.4 17.4 27 20.4 26.4 23 C25.8 25.6 22.6 26.6 20.6 25.4"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M20 22.4 C22.4 23 24.6 22.4 25.8 21" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={15} cy={8} r={4.4} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M10.6 6.4 C10.2 3.4 19.8 3.4 19.4 6.4 C19 8.6 19.4 10.6 20 12" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
