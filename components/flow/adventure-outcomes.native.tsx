import type { ComponentType } from "react";

import { FlowNotice } from "./flow-notice";
import type { AdventureOutcomesProps } from "./types";

/** React Flow needs a DOM; the run list below the canvas works on native regardless. */
export const AdventureOutcomes: ComponentType<AdventureOutcomesProps> = () => (
  <FlowNotice message="The outcome tree needs a browser. Open this page on the web." />
);
