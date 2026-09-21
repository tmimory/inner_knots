import { Platform, StyleSheet, type ViewStyle } from "react-native";

/**
 * Shared pieces for the portal-backed overlays (Dialog, Select, Tooltip, and whatever
 * popovers later phases add). Each primitive keeps its own markup; this file owns the
 * one platform decision they all have to make the same way.
 */

/** Props every portal-backed content component accepts. */
export type PortalledProps = {
  /** Named `PortalHost` to render into. Native only; the web portal uses the document. */
  portalHost?: string;
};

/**
 * Native overlays have to fill the screen themselves; on web the primitive positions
 * itself and an absolute fill would fight it.
 */
export const overlayStyle: ViewStyle | undefined =
  Platform.OS === "web" ? undefined : StyleSheet.absoluteFill;
