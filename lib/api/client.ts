import "server-only";
import type { ApiRequestOptions, ApiResult } from "@/lib/api/errors";
import { requestApiTransport } from "@/lib/api/transport";
import { decryptWebSession, sessionCookieName } from "@/lib/auth/session";
import { apiAccessCookie, apiRefreshCookie } from "@/lib/api/auth-cookies";

export async function apiRequest<T>(path: string, options: ApiRequestOptions<T>): Promise<ApiResult<T>> {
  if (options.auth === "public") return requestApiTransport(path, options);
  const { cookies } = await import("next/headers");
  const cookieValue = (await cookies()).get(sessionCookieName())?.value;
  const session = decryptWebSession(cookieValue);
  if (!session) return { ok: false, error: { kind: "http", statusCode: 401, message: "Unauthorized" } };
  const apiCookie = options.auth === "refresh-session" ? apiRefreshCookie(session.tokens.refreshToken) : apiAccessCookie(session.tokens.accessToken);
  return requestApiTransport(path, { ...options, cookie: apiCookie });
}
