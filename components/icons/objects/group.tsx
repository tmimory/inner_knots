import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function GroupIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Group">
      <Path
        d="M7 16 C4.2 16 2.4 18.2 2.4 21 V29 H11.6 V21 C11.6 18.2 9.8 16 7 16 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Circle cx={7} cy={12.4} r={3.4} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path
        d="M25 16 C22.2 16 20.4 18.2 20.4 21 V29 H29.6 V21 C29.6 18.2 27.8 16 25 16 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Circle cx={25} cy={12.4} r={3.4} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path
        d="M16 13 C12.4 13 10 15.8 10 19.4 V29 H22 V19.4 C22 15.8 19.6 13 16 13 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Circle cx={16} cy={8.4} r={4.2} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
    </GlyphFrame>
  );
}
