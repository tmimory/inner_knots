/**
 * Typed client for the Expo Router API routes in `app/api/**+api.ts`.
 *
 * Web bundles talk to the same origin, so a relative path is correct. Native
 * bundles need an absolute URL: set `EXPO_PUBLIC_API_BASE_URL` when the dev server
 * is not on localhost (for example the LAN address shown by `expo start`).
 */
import { Platform } from "react-native";

const DEFAULT_NATIVE_BASE_URL = "http://localhost:8081";

/** Thrown for any non-2xx API response. Carries the status and the raw body. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`API request failed with ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** Base URL for API routes: empty (same origin) on web, absolute on native. */
export function apiBaseUrl(): string {
  if (Platform.OS === "web") return "";
  return process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_NATIVE_BASE_URL;
}

/** Resolves a route path (`/api/health`) against the platform base URL. */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl()}${normalized}`;
}

/** `fetch` for API routes: resolves the URL, sends JSON, throws `ApiError` on failure. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return (await response.json()) as T;
}
