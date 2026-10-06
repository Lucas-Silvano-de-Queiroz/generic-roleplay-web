import { NextResponse, type NextRequest } from "next/server";
import { getTokenExpiry, decryptWebSession, encryptWebSession, sessionCookieName, sessionCookieOptions } from "@/lib/auth/session";
import { refreshWebTokens } from "@/lib/auth/refresh";

const REFRESH_MARGIN_MS = 2 * 60 * 1000;

export async function proxy(request: NextRequest) {
  const cookieName = sessionCookieName();
  const cookieValue = request.cookies.get(cookieName)?.value;
  if (!cookieValue) return NextResponse.next();

  const session = decryptWebSession(cookieValue);
  if (!session) return expireSessionCookie(request, cookieName);

  const accessTokenExpiresAt = getTokenExpiry(session.tokens.accessToken);
  if (accessTokenExpiresAt !== null && accessTokenExpiresAt > Date.now() + REFRESH_MARGIN_MS) return NextResponse.next();

  const refreshed = await refreshWebTokens(session.tokens.refreshToken);
  if (refreshed.ok) {
    const encryptedSession = encryptWebSession({ tokens: refreshed.data, expiresAt: session.expiresAt });
    request.cookies.set(cookieName, encryptedSession);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(cookieName, encryptedSession, sessionCookieOptions(session.expiresAt));
    return response;
  }

  // A concurrent request may have won rotation and will set the newer cookie.
  // Do not let this response's 401 erase that cookie in the browser.
  if (refreshed.error.statusCode === 401) return NextResponse.next();
  if (session.expiresAt <= Date.now()) return expireSessionCookie(request, cookieName);
  return NextResponse.next();
}

function expireSessionCookie(request: NextRequest, cookieName: string) {
  request.cookies.delete(cookieName);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(cookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
