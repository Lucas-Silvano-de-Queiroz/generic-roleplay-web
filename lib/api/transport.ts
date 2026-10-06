import "server-only";
import { getApiBaseUrl } from "@/lib/api/config";
import type { ApiFailure, ApiResult } from "@/lib/api/errors";

const MAX_JSON_BYTES = 102400;
const REQUEST_TIMEOUT_MS = 10000;

function parseRetryAfter(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  return Number(value);
}
function errorBody(value: unknown): Pick<ApiFailure, "message" | "details"> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { message: "Request failed" };
  const body = value as Record<string, unknown>;
  const details = Array.isArray(body.details) ? body.details.filter((entry): entry is { field: string; message: string } => typeof entry === "object" && entry !== null && typeof (entry as { field?: unknown }).field === "string" && typeof (entry as { message?: unknown }).message === "string") : undefined;
  return { message: typeof body.message === "string" ? body.message : "Request failed", ...(details?.length ? { details } : {}) };
}

export async function requestApiTransport<T>(
  path: string,
  options: { method: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; accessToken?: string; cookie?: string; parseResponse?: (value: unknown) => T; parseResponseHeaders?: (headers: Headers) => T }
): Promise<ApiResult<T>> {
  let url: URL;
  try {
    if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Path must be relative");
    url = new URL(path, getApiBaseUrl());
  } catch {
    return { ok: false, error: { kind: "invalid-response", message: "Invalid API configuration or path" } };
  }
  let body: string | undefined;
  if (options.body !== undefined) {
    try { body = JSON.stringify(options.body); }
    catch { return { ok: false, error: { kind: "invalid-response", message: "Invalid JSON body" } }; }
    if (Buffer.byteLength(body, "utf8") > MAX_JSON_BYTES) return { ok: false, error: { kind: "http", statusCode: 413, message: "Payload too large" } };
  }
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: options.method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
        ...(options.cookie ? { Cookie: options.cookie } : {}),
      },
      ...(body === undefined ? {} : { body }),
      cache: "no-store",
      signal: abortController.signal,
    });
    const requestId = response.headers.get("X-Request-Id") ?? undefined;
    if (response.ok && options.parseResponseHeaders) {
      try { return { ok: true, data: options.parseResponseHeaders(response.headers) }; }
      catch { return { ok: false, error: { kind: "invalid-response", statusCode: response.status, message: "Response did not set valid authentication cookies", requestId } }; }
    }
    if (response.status === 204) return response.ok ? { ok: true, data: undefined as T } : { ok: false, error: { kind: "http", statusCode: 204, message: "Request failed" } };
    let value: unknown;
    try { value = await response.json(); }
    catch {
      if (!response.ok) return { ok: false, error: { kind: "http", statusCode: response.status, message: "Request failed", requestId, retryAfterSeconds: parseRetryAfter(response.headers.get("Retry-After")) } };
      return { ok: false, error: { kind: "invalid-response", statusCode: response.status, message: "Response body was not valid JSON", requestId } };
    }
    if (!response.ok) {
      const parsed = errorBody(value);
      return { ok: false, error: { kind: "http", statusCode: response.status, ...parsed, requestId, retryAfterSeconds: parseRetryAfter(response.headers.get("Retry-After")) } };
    }
    if (!options.parseResponse) return { ok: true, data: value as T };
    try { return { ok: true, data: options.parseResponse(value) }; }
    catch { return { ok: false, error: { kind: "invalid-response", statusCode: response.status, message: "Response did not match its contract", requestId } }; }
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    return { ok: false, error: { kind: timedOut ? "timeout" : "network", message: timedOut ? "Request timed out" : "Network request failed" } };
  } finally { clearTimeout(timeout); }
}
