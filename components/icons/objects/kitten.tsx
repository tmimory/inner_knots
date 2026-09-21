import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, Legs, useGlyphPen, type ObjectIconProps } from "./glyph";

export function KittenIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Kitten">
      <Path d="M7 22 C3.6 21 3.4 16 6.6 15.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Legs xs={[10, 13.4, 17, 20.4]} top={27} bottom={29.6} pen={pen} />
      <Path
        d="M12 19 C9 19 7 21 7 23.6 C7 26 9 27.4 12 27.4 H18 C21 27.4 23 26 23 23.6 C23 21 21 19 18 19 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M19 12 L18.4 8 L21.8 10 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M25 12 L25.6 8 L22.2 10 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Circle cx={22} cy={14.4} r={4.6} fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Circle cx={20.4} cy={13.6} r={0.9} fill={pen.ink} />
      <Circle cx={23.6} cy={13.6} r={0.9} fill={pen.ink} />
      <Path d="M22 16.4 L21 15.4 H23 Z" fill={pen.ink} />
    </GlyphFrame>
  );
}
