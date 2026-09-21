import { createElement } from "react";

import type { ObjectIconProps } from "./glyph";
import { objectIcon } from "./registry";

export type ObjectGlyphProps = ObjectIconProps & {
  /** Icon id from the object set; an unknown one draws the question mark. */
  icon: string;
};

/**
 * One object glyph, chosen by id.
 *
 * `objectIcon(id)` hands back a component, and calling it as `<Glyph />` would
 * declare a new component type on every render — new type, new tree, lost state.
 * Creating the element instead keeps the identity the icon module already owns,
 * which is why every screen that draws a glyph from data goes through here.
 */
export function ObjectGlyph({ icon, ...props }: ObjectGlyphProps) {
  return createElement(objectIcon(icon), props);
}
