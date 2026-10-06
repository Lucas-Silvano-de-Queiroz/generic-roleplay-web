import type { TokenPair } from "@/lib/api/contracts";

export const apiAccessCookieName = () => process.env.NODE_ENV === "production" ? "__Host-grp-access" : "grp-access";
export const apiRefreshCookieName = () => process.env.NODE_ENV === "production" ? "__Host-grp-refresh" : "grp-refresh";

function cookieValueFromHeaders(headers: Headers, cookieName: string): string {
  const setCookies = headers.getSetCookie();
  const matchingCookie = setCookies.find((setCookie) => setCookie.startsWith(`${cookieName}=`));
  if (!matchingCookie) throw new Error(`Authentication response did not set ${cookieName}`);
  const encodedValue = matchingCookie.slice(cookieName.length + 1).split(";", 1)[0];
  let value: string;
  try { value = decodeURIComponent(encodedValue); }
  catch { throw new Error(`Authentication response set an invalid ${cookieName}`); }
  if (!value || value.length > 4096) throw new Error(`Authentication response set an invalid ${cookieName}`);
  return value;
}

export function decodeTokenPairFromSetCookie(headers: Headers): TokenPair {
  return {
    accessToken: cookieValueFromHeaders(headers, apiAccessCookieName()),
    refreshToken: cookieValueFromHeaders(headers, apiRefreshCookieName()),
    tokenType: "Bearer",
  };
}

export function apiAccessCookie(token: string): string {
  return `${apiAccessCookieName()}=${encodeURIComponent(token)}`;
}

export function apiRefreshCookie(token: string): string {
  return `${apiRefreshCookieName()}=${encodeURIComponent(token)}`;
}
