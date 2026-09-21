/**
 * Identifier generation. Every entity, run, span and log line gets an id from
 * here so that the format is consistent and greppable in the JSONL stores.
 */

/**
 * A new unique id, optionally namespaced: `newId("run")` -> `run_3f2a…`.
 *
 * Uses `crypto.randomUUID()`, which exists in Node 19+ and in every browser the
 * app targets. The dashes are stripped so ids stay easy to select and to read
 * inside a JSONL line.
 */
export function newId(prefix?: string): string {
  const uuid = crypto.randomUUID().replace(/-/g, "");
  return prefix ? `${prefix}_${uuid}` : uuid;
}
