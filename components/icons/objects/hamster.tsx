import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function HamsterIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Hamster">
      <Circle cx={9.6} cy={11} r={3} fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Circle cx={22.4} cy={11} r={3} fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path
        d="M16 9 C9.6 9 5 14.6 5 20.8 C5 26 9.6 29.4 16 29.4 C22.4 29.4 27 26 27 20.8 C27 14.6 22.4 9 16 9 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Circle cx={12.6} cy={17} r={1.2} fill={pen.ink} />
      <Circle cx={19.4} cy={17} r={1.2} fill={pen.ink} />
      <Path d="M16 21 L14.6 19.6 H17.4 Z" fill={pen.ink} />
      <Path d="M16 21 V22.6 M16 22.6 C14.6 24 13 23.4 12.6 22.4 M16 22.6 C17.4 24 19 23.4 19.4 22.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M13 20 L7.6 19 M13 22 L7.6 23.4 M19 20 L24.4 19 M19 22 L24.4 23.4" stroke={pen.wash} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
