import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, Legs, useGlyphPen, type ObjectIconProps } from "./glyph";

export function GoatIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Goat">
      <Path d="M4 16.6 L1.6 14.6" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Legs xs={[7, 11, 17, 21]} top={26} bottom={29.6} pen={pen} />
      <Path d="M26.6 9.6 C26 6 23.4 4.4 21.4 5.6 C23.6 6.2 25 7.8 25.4 10.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M29.4 10.4 C30 6.8 28 4.6 25.8 5.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path
        d="M9 15 C6 15 4 17.4 4 20.6 V23 C4 25 5.6 26 8 26 H19 C21.6 26 23.4 24.4 23.4 21.6 V18 C23.4 16 21.6 15 19 15 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path
        d="M18.6 17.4 C20.6 14 23.6 11 26.4 10 C29 9 30.6 11.4 29.4 13.6 C28.4 15.6 26.6 17.4 25 19.4 C24 20.8 22.6 21 21.4 20.2 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M25.4 13 C23 12.4 22.6 15 24.6 15.4 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M25.4 18.6 C24.6 21.6 26.4 23.6 27.4 21.2 C28 19.6 27.4 18.4 26.6 17.6 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={27} cy={12.8} r={0.9} fill={pen.ink} />
    </GlyphFrame>
  );
}
