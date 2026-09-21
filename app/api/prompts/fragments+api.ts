/**
 * `GET /api/prompts/fragments` — every markdown prompt fragment on disk, with
 * its declared variables and its raw body.
 *
 * This is what a "view the prompts" screen reads. Bodies are returned unrendered
 * so the reader sees the template, placeholders and all.
 */
import { handle, ok } from "@/lib/api/http";
import { listFragments } from "@/lib/prompts/loader";

export type FragmentSummary = {
  id: string;
  description: string;
  variables: string[];
  body: string;
};

export type FragmentsResponse = { fragments: FragmentSummary[] };

export const GET = handle(async () => {
  const fragments = await listFragments();
  return ok({
    fragments: fragments.map(({ id, description, variables, body }) => ({
      id,
      description,
      variables,
      body,
    })),
  } satisfies FragmentsResponse);
});
