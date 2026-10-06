import "server-only";

import { createHash } from "node:crypto";
import { decodeTokenPairFromSetCookie, apiRefreshCookie } from "@/lib/api/auth-cookies";
import type { ApiResult } from "@/lib/api/errors";
import { requestApiTransport } from "@/lib/api/transport";
import type { TokenPair } from "@/lib/api/contracts";

const inFlightRefreshes = new Map<string, Promise<ApiResult<TokenPair>>>();

export function refreshWebTokens(refreshToken: string): Promise<ApiResult<TokenPair>> {
  const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
  const existingRefresh = inFlightRefreshes.get(refreshTokenHash);
  if (existingRefresh) return existingRefresh;

  const refreshRequest = requestApiTransport("/auth/refresh", {
    method: "POST",
    cookie: apiRefreshCookie(refreshToken),
    parseResponseHeaders: decodeTokenPairFromSetCookie,
  });
  inFlightRefreshes.set(refreshTokenHash, refreshRequest);
  return refreshRequest.finally(() => {
    if (inFlightRefreshes.get(refreshTokenHash) === refreshRequest) inFlightRefreshes.delete(refreshTokenHash);
  });
}
