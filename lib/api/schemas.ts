/**
 * Schema pieces shared by the API route bodies.
 *
 * `lib/domain/enums.ts` is a contract file shared verbatim with the provider
 * layer, so route-level conveniences such as a default output mode live here
 * rather than being bolted onto it.
 */
import { z } from "zod";

import { OUTPUT_MODES } from "@/lib/domain/enums";

/**
 * The output mode a prompt preview should be composed for. Previews default to
 * structured output, which is what a character gets unless it says otherwise.
 */
export const previewOutputModeSchema = z.enum(OUTPUT_MODES).default("structured");
