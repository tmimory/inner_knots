/**
 * The prompt template language.
 *
 * Deliberately tiny: prompt fragments are prose with holes in them, not
 * programs. Four forms are supported and nothing else, so a fragment can be
 * read as English by someone who has never seen the code.
 *
 * ```
 * {{name}}                      plain substitution, never HTML-escaped
 * {{#if name}}…{{/if}}          included when `name` is truthy and non-empty
 * {{#if name}}…{{else}}…{{/if}} the alternative when it is not
 * {{#each list}}…{{/each}}      repeated per item; `{{this}}` is the item
 * {{this.field}}                a field of the current item
 * ```
 *
 * A block tag that sits alone on its line takes the line with it, so markdown
 * does not gain blank lines where a condition was false.
 */

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateError";
  }
}

export type TemplateNode =
  | { kind: "text"; text: string }
  | { kind: "var"; path: string }
  | { kind: "if"; path: string; children: TemplateNode[]; alt: TemplateNode[] }
  | { kind: "each"; path: string; children: TemplateNode[] };

type Tag = { start: number; end: number; sigil: "#" | "/" | ""; body: string };

const TAG_PATTERN = /\{\{\s*([#/]?)\s*([^{}]*?)\s*\}\}/g;
const BLANK_LINE = /^[ \t]*$/;

/** Parses a template body into nodes. Throws on an unknown or unbalanced tag. */
export function parseTemplate(source: string): TemplateNode[] {
  const tags: Tag[] = [];
  TAG_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_PATTERN.exec(source)) !== null) {
    tags.push({
      start: match.index,
      end: TAG_PATTERN.lastIndex,
      sigil: (match[1] ?? "") as Tag["sigil"],
      body: match[2] ?? "",
    });
  }

  // A block tag alone on its line swallows the whole line, including its newline.
  for (const tag of tags) {
    if (tag.sigil === "" && tag.body.trim() !== "else") continue;
    const lineStart = source.lastIndexOf("\n", tag.start - 1) + 1;
    const newline = source.indexOf("\n", tag.end);
    const lineEnd = newline === -1 ? source.length : newline;
    if (BLANK_LINE.test(source.slice(lineStart, tag.start)) && BLANK_LINE.test(source.slice(tag.end, lineEnd))) {
      tag.start = lineStart;
      tag.end = newline === -1 ? source.length : newline + 1;
    }
  }

  const root: TemplateNode[] = [];
  type Frame = { kind: "if" | "each"; path: string; children: TemplateNode[]; alt: TemplateNode[]; inAlt: boolean };
  const stack: Frame[] = [];
  const target = (): TemplateNode[] => {
    const frame = stack[stack.length - 1];
    if (!frame) return root;
    return frame.inAlt ? frame.alt : frame.children;
  };
  let cursor = 0;

  for (const tag of tags) {
    const textEnd = Math.max(cursor, tag.start);
    if (textEnd > cursor) target().push({ kind: "text", text: source.slice(cursor, textEnd) });
    cursor = Math.max(cursor, tag.end);

    if (tag.sigil === "#") {
      const [keyword, ...rest] = tag.body.split(/\s+/);
      if (keyword !== "if" && keyword !== "each") {
        throw new TemplateError(`Unknown block "{{#${tag.body}}}". Only #if and #each exist.`);
      }
      const path = rest.join(" ").trim();
      if (!path) throw new TemplateError(`"{{#${keyword}}}" needs a variable name.`);
      stack.push({ kind: keyword, path, children: [], alt: [], inAlt: false });
    } else if (tag.sigil === "/") {
      const keyword = tag.body.trim();
      const open = stack.pop();
      if (!open) throw new TemplateError(`"{{/${keyword}}}" closes a block that was never opened.`);
      if (open.kind !== keyword) {
        throw new TemplateError(`"{{/${keyword}}}" closes a "{{#${open.kind}}}" block.`);
      }
      target().push(
        open.kind === "if"
          ? { kind: "if", path: open.path, children: open.children, alt: open.alt }
          : { kind: "each", path: open.path, children: open.children },
      );
    } else {
      const path = tag.body.trim();
      if (!path) throw new TemplateError("An empty {{}} tag has nothing to substitute.");
      if (path === "else") {
        const open = stack[stack.length - 1];
        if (!open || open.kind !== "if") throw new TemplateError('"{{else}}" is only allowed inside an {{#if}} block.');
        if (open.inAlt) throw new TemplateError('An {{#if}} block may have only one "{{else}}".');
        open.inAlt = true;
        continue;
      }
      target().push({ kind: "var", path });
    }
  }

  if (stack.length > 0) {
    throw new TemplateError(`"{{#${stack[stack.length - 1]?.kind}}}" is never closed.`);
  }
  if (cursor < source.length) root.push({ kind: "text", text: source.slice(cursor) });

  return root;
}

/** Values a template can be rendered against. */
export type TemplateVars = Record<string, unknown>;

type Scope = { vars: TemplateVars; item: unknown; inEach: boolean };

function walk(value: unknown, segments: readonly string[]): unknown {
  let current = value;
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function resolve(path: string, scope: Scope): unknown {
  const segments = path.split(".");
  const [head, ...rest] = segments;
  if (head === "this") {
    if (!scope.inEach) throw new TemplateError('"{{this}}" is only meaningful inside an {{#each}} block.');
    return rest.length === 0 ? scope.item : walk(scope.item, rest);
  }
  return walk(scope.vars, segments);
}

/** Empty strings, empty arrays, zero, false, null and undefined are all falsy. */
function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return value !== 0;
  return true;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(stringify).join(", ");
  return JSON.stringify(value);
}

function renderNodes(nodes: readonly TemplateNode[], scope: Scope): string {
  let out = "";
  for (const node of nodes) {
    switch (node.kind) {
      case "text":
        out += node.text;
        break;
      case "var":
        out += stringify(resolve(node.path, scope));
        break;
      case "if":
        out += isTruthy(resolve(node.path, scope))
          ? renderNodes(node.children, scope)
          : renderNodes(node.alt, scope);
        break;
      case "each": {
        const list = resolve(node.path, scope);
        if (list === null || list === undefined) break;
        if (!Array.isArray(list)) {
          throw new TemplateError(`"{{#each ${node.path}}}" needs a list, got ${typeof list}.`);
        }
        for (const item of list) out += renderNodes(node.children, { ...scope, item, inEach: true });
        break;
      }
    }
  }
  return out;
}

/** Renders parsed nodes. Tidies runs of blank lines left by omitted blocks. */
export function renderTemplate(nodes: readonly TemplateNode[], vars: TemplateVars): string {
  const raw = renderNodes(nodes, { vars, item: undefined, inEach: false });
  return raw.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

/** Renders a template source in one step. Used by tests and one-off previews. */
export function renderSource(source: string, vars: TemplateVars): string {
  return renderTemplate(parseTemplate(source), vars);
}

/**
 * Every top-level variable a template reads. `this` and its fields belong to the
 * enclosing `{{#each}}`, so they are not reported.
 */
export function templateVariables(nodes: readonly TemplateNode[]): string[] {
  const found = new Set<string>();
  const visit = (list: readonly TemplateNode[]): void => {
    for (const node of list) {
      if (node.kind === "text") continue;
      const root = node.path.split(".")[0];
      if (root && root !== "this") found.add(root);
      if (node.kind === "var") continue;
      visit(node.children);
      if (node.kind === "if") visit(node.alt);
    }
  };
  visit(nodes);
  return [...found];
}
