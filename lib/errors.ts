/**
 * Reading an unknown thrown value.
 *
 * `catch` binds `unknown`, and almost every call site wants the same sentence out
 * of it. This is that sentence, in one place, rather than the same ternary spelled
 * out in the engine, the providers, the API routes and the screens.
 *
 * `lib/providers/shared/trace.ts` deliberately does not use it: a provider failure
 * is recorded with its name, status and body as well as its message, so it reads
 * the error more closely than this does.
 */

/** The message of a thrown value, whatever kind of thing was thrown. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
