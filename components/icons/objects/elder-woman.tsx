import { Circle, Path } from "react-native-svg";

import { Figure, GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function ElderWomanIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Elderly woman">
      <Figure name="woman" pen={pen} />
      <Circle cx={16} cy={2.8} r={2.4} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M12.4 5.4 C13.4 4 18.6 4 19.6 5.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M27 14 V29" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M24.6 14 C25.4 12.6 27.8 12.6 27 14.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
    </GlyphFrame>
  );
}
