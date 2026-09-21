/**
 * Loads prompt fragments from `prompts/**\/*.md`. Server only.
 *
 * A fragment is a markdown file with YAML frontmatter:
 *
 * ```
 * ---
 * id: trolley/situation
 * description: The tracks, what is on them, and the two possible actions.
 * variables: [track1, track2]
 * ---
 * ```
 *
 * The id must equal the path under `prompts/` without the extension, so a
 * fragment can be found from its id and vice versa. Files are cached by id and
 * re-read when their mtime changes, so editing a prompt during `npm run dev`
 * takes effect on the next request without a restart.
 */
import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { parseTemplate, templateVariables, type TemplateNode } from "./template";

export class PromptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromptError";
  }
}

export type Fragment = {
  id: string;
  description: string;
  /** Variables the fragment declares it needs, in frontmatter order. */
  variables: string[];
  /** The template body, without the frontmatter. */
  body: string;
  nodes: TemplateNode[];
  /** Absolute path, for error messages and the fragments API route. */
  file: string;
};

type CacheEntry = { fragment: Fragment; mtimeMs: number };

const cache = new Map<string, CacheEntry>();

/** Root of the markdown fragments, resolved against the process cwd. */
export function promptsDir(): string {
  return path.resolve(process.cwd(), "prompts");
}

function idFromFile(file: string): string {
  return path.relative(promptsDir(), file).replace(/\\/g, "/").replace(/\.md$/, "");
}

function fileFromId(id: string): string {
  return path.join(promptsDir(), `${id}.md`);
}

async function listFiles(dir: string): Promise<string[]> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full)));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(full);
  }
  return files.sort();
}

function parseFragment(file: string, raw: string): Fragment {
  const { data, content } = matter(raw);
  const expectedId = idFromFile(file);
  const id = typeof data.id === "string" ? data.id : undefined;

  if (!id) throw new PromptError(`${file}: frontmatter is missing an "id".`);
  if (id !== expectedId) {
    throw new PromptError(`${file}: declares id "${id}" but its path says "${expectedId}".`);
  }

  const description = typeof data.description === "string" ? data.description : "";
  if (!description) throw new PromptError(`${file}: frontmatter is missing a "description".`);

  const declared = Array.isArray(data.variables) ? data.variables.map(String) : [];
  const body = content.trim();
  const nodes = parseTemplate(body);

  const used = templateVariables(nodes);
  const undeclared = used.filter((name) => !declared.includes(name));
  if (undeclared.length > 0) {
    throw new PromptError(`${file}: uses ${undeclared.map((n) => `"${n}"`).join(", ")} without declaring it.`);
  }

  return { id, description, variables: declared, body, nodes, file };
}

async function load(file: string): Promise<Fragment> {
  const id = idFromFile(file);
  const stat = await fs.promises.stat(file);
  const cached = cache.get(id);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.fragment;

  const fragment = parseFragment(file, await fs.promises.readFile(file, "utf8"));
  cache.set(id, { fragment, mtimeMs: stat.mtimeMs });
  return fragment;
}

/** One fragment by id (`"trolley/situation"`). Throws when it does not exist. */
export async function getFragment(id: string): Promise<Fragment> {
  const file = fileFromId(id);
  try {
    return await load(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new PromptError(`No prompt fragment with id "${id}" (looked in ${file}).`);
    }
    throw error;
  }
}

/** Every fragment, sorted by id. Powers the fragments API route. */
export async function listFragments(): Promise<Fragment[]> {
  const files = await listFiles(promptsDir());
  return Promise.all(files.map(load));
}

/** Empties the cache. Tests use it; nothing in the app needs to. */
export function clearFragmentCache(): void {
  cache.clear();
}
