/**
 * Rendering prompt fragments by id.
 *
 * `render` is strict on purpose: a fragment that declares a variable must be
 * given it, and a fragment may not read a variable it did not declare. Prompt
 * bugs are silent otherwise — a missing name renders as an empty space and the
 * model answers a subtly different question.
 */
import { getFragment, listFragments, PromptError } from "./loader";
import { renderTemplate, type TemplateVars } from "./template";

/** Renders the fragment `id` with `vars`. */
export async function render(id: string, vars: TemplateVars = {}): Promise<string> {
  const fragment = await getFragment(id);

  const missing = fragment.variables.filter((name) => vars[name] === undefined);
  if (missing.length > 0) {
    throw new PromptError(`Fragment "${id}" needs ${missing.map((n) => `"${n}"`).join(", ")}.`);
  }

  return renderTemplate(fragment.nodes, vars);
}

/** Renders several fragments and joins the non-empty results with a blank line. */
export async function renderMany(
  parts: readonly { id: string; vars?: TemplateVars }[],
  separator = "\n\n",
): Promise<string> {
  const rendered = await Promise.all(parts.map((part) => render(part.id, part.vars ?? {})));
  return rendered.filter((text) => text.trim().length > 0).join(separator);
}

/**
 * Startup check: parses every fragment on disk, which surfaces a malformed
 * template or an undeclared variable as an error rather than at render time.
 * Returns the ids it validated.
 */
export async function checkFragments(): Promise<string[]> {
  return (await listFragments()).map((fragment) => fragment.id);
}
