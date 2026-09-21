import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function QuestionIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Something else">
      <Circle cx={16} cy={16} r={12.4} fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.bold} />
      <Path
        d="M11.6 12 C11.6 8.6 13.6 6.6 16.4 6.6 C19.4 6.6 21.4 8.6 21.4 11.4 C21.4 15 17.6 15.6 16.6 18 C16.2 19 16.2 19.6 16.2 20.4"
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.bold}
      />
      <Circle cx={16.2} cy={24.4} r={1.6} fill={pen.ink} />
    </GlyphFrame>
  );
}
