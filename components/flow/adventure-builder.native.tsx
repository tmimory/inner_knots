import type { ComponentType } from "react";

import { FlowNotice } from "./flow-notice";
import type { AdventureBuilderProps } from "./types";

/** React Flow needs a DOM; on native the page says so and leaves the rest working. */
export const AdventureBuilder: ComponentType<AdventureBuilderProps> = () => (
  <FlowNotice message="The tree builder needs a browser. Open this page on the web." />
);
