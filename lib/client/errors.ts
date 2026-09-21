/**
 * Turning a failed API call into something a person can read.
 *
 * `apiFetch` throws an `ApiError` carrying the raw response body, which for every
 * route in `app/api/**` is `{ error: string }`. That sentence is what belongs on
 * screen — "API request failed with 400" is not.
 */
import { ApiError } from "./api";

/** A readable message for anything thrown by the typed clients. */
export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const parsed: unknown = JSON.parse(error.body);
      if (parsed && typeof parsed === "object" && "error" in parsed) {
        const message = (parsed as { error: unknown }).error;
        if (typeof message === "string" && message.trim() !== "") return message;
      }
    } catch {
      // Not JSON: fall through to the body, then to the generic message.
    }
    return error.body.trim() === "" ? error.message : error.body;
  }
  return error instanceof Error ? error.message : String(error);
}

/** True when a thrown error is the store refusing an identifier that is taken. */
export function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}
