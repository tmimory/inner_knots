/**
 * Helpers shared by the Expo Router API routes. Server only.
 *
 * Every 4xx and 5xx response is `{ error: string }`, so the client helpers in
 * `lib/client/` can surface one message shape whatever went wrong.
 */
import { ZodError, type z } from "zod";

import { PromptError } from "@/lib/prompts/loader";

export type ApiErrorBody = { error: string };

/** A request the caller got wrong. `handle` turns it into a 400. */
export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export function ok<T>(body: T, status = 200): Response {
  return Response.json(body, { status });
}

export function fail(status: number, error: string): Response {
  return Response.json({ error } satisfies ApiErrorBody, { status });
}

export const badRequest = (error: string): Response => fail(400, error);
export const notFound = (error: string): Response => fail(404, error);
export const conflict = (error: string): Response => fail(409, error);

/** Turns a zod issue list into one readable sentence. */
export function describeZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");
}

/**
 * Wraps a handler so a validation failure, a prompt error or an unexpected
 * throw becomes a JSON response instead of an HTML stack trace.
 */
export function handle<A extends unknown[]>(
  fn: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ZodError) return badRequest(describeZodError(error));
      if (error instanceof BadRequestError) return badRequest(error.message);
      if (error instanceof PromptError) return badRequest(error.message);
      console.error("[api]", error);
      return fail(500, error instanceof Error ? error.message : "Unexpected error");
    }
  };
}

/** Parses and validates a JSON request body. Throws `ZodError` on a bad shape. */
export async function readBody<T>(request: Request, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new BadRequestError("Request body is not valid JSON.");
  }
  return schema.parse(raw);
}

/** The query string of a request, as a plain object. */
export function query(request: Request): URLSearchParams {
  return new URL(request.url).searchParams;
}

/** Reads a query parameter constrained to a known set of values. */
export function enumParam<const T extends readonly string[]>(
  params: URLSearchParams,
  name: string,
  allowed: T,
): T[number] | undefined {
  const value = params.get(name);
  if (value === null) return undefined;
  if (!(allowed as readonly string[]).includes(value)) {
    throw new BadRequestError(`${name} must be one of: ${allowed.join(", ")}.`);
  }
  return value as T[number];
}

/** Reads a positive integer query parameter. */
export function intParam(params: URLSearchParams, name: string): number | undefined {
  const value = params.get(name);
  if (value === null) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestError(`${name} must be a positive integer.`);
  }
  return parsed;
}
