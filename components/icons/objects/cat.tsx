import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, Legs, useGlyphPen, type ObjectIconProps } from "./glyph";

export function CatIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Cat">
      <Path d="M4.4 20 C1.4 18 1.6 12.6 5 11.6" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Legs xs={[7, 11, 18, 22]} top={26} bottom={29.6} pen={pen} />
      <Path
        d="M10 16 C6.6 16 4 18.4 4 21.6 C4 24.6 6.6 26.4 10 26.4 H19 C22.4 26.4 24.6 24.6 24.6 21.6 C24.6 18.4 22.4 16 19 16 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M21.4 10 L20.6 5.6 L24.4 8 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M27.6 10 L28.4 5.6 L24.6 8 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Circle cx={24.6} cy={12.4} r={4.4} fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Circle cx={23} cy={11.6} r={0.9} fill={pen.ink} />
      <Circle cx={26.4} cy={11.6} r={0.9} fill={pen.ink} />
      <Path d="M24.6 14.4 L23.6 13.4 H25.6 Z" fill={pen.ink} />
      <Path d="M27.4 13.6 L30.8 12.6 M27.4 15 L30.8 15.6" stroke={pen.wash} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
