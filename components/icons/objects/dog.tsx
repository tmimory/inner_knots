import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, Legs, useGlyphPen, type ObjectIconProps } from "./glyph";

export function DogIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Dog">
      <Path d="M4.4 18.6 C1.6 17 1.6 13 4.4 12" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Legs xs={[7, 11, 18, 22]} top={25} bottom={29.6} pen={pen} />
      <Path
        d="M10 15 C6.6 15 4 17.6 4 21 C4 24.2 6.6 26 10 26 H19 C22.4 26 24.6 24.2 24.6 21 C24.6 17.6 22.4 15 19 15 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path
        d="M27 9.4 C30 9.4 31 10.6 31 12 C31 13.4 29.4 14.2 27 13.4 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Circle cx={24.6} cy={11.4} r={4.4} fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M22.6 7.6 C20.4 5.4 19.4 9 20.6 12.6 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Circle cx={26} cy={10.4} r={0.9} fill={pen.ink} />
      <Circle cx={30.4} cy={11} r={0.9} fill={pen.ink} />
    </GlyphFrame>
  );
}
