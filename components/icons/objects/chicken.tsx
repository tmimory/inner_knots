import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function ChickenIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Chicken">
      <Path d="M11 28 V30.4 M8.6 30.4 H13.6 M16.4 27.4 V30.4 M14 30.4 H19" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path
        d="M4 20 C1 18 0.6 13.6 2.6 11 C3.4 15 5.4 17.6 7 18.6 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path
        d="M12 14 C7 14 3.6 18 3.6 22 C3.6 26 7.4 28.4 12 28.4 C17.6 28.4 21.6 25 21.6 20.6 C21.6 16.6 17.6 14 12 14 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path
        d="M19.4 7.4 C20.4 4.4 22 6 22.4 3.6 C23.6 5.6 24.6 4.4 25.2 6.4 C25.6 7.6 25.2 8.6 25.2 8.6 C23.6 7 21 7 19.4 7.4 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.hair}
      />
      <Circle cx={22} cy={11.4} r={4.4} fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M25.6 11 L30.4 12.6 L25.6 14 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M24.4 14 C26.4 14.8 26 17.4 24 16.6 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={23} cy={10.4} r={0.9} fill={pen.ink} />
      <Path d="M9 19 C12.6 16.6 17 17.6 19 21 C16 24 10.6 24 9 19 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
