/**
 * Schema pieces shared by the API route bodies.
 *
 * `lib/domain/enums.ts` is a contract file shared verbatim with the provider
 * layer, so route-level conveniences such as a default decision style live here
 * rather than being bolted onto it.
 */
import { z } from "zod";

import { DECISION_STYLES } from "@/lib/domain/enums";

/**
 * The decision style a prompt preview should be composed for. Previews default
 * to structured output, which is what a character gets unless it says otherwise.
 */
export const previewDecisionStyleSchema = z.enum(DECISION_STYLES).default("structured");
