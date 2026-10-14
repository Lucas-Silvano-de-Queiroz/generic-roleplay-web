import { beforeEach, expect, it, vi } from "vitest";
import { createWebSession, decryptWebSession, encryptWebSession, getTokenExpiry, sessionCookieOptions } from "@/lib/auth/session";
import { refreshWebTokens } from "@/lib/auth/refresh";
import { decodeTokenPairFromSetCookie, apiAccessCookie, apiRefreshCookie } from "@/lib/api/auth-cookies";
import { safeNextPath } from "@/lib/auth/redirect-target";
import { token, id } from "../support/fixtures";

const { setCookie } = vi.hoisted(() => ({ setCookie: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: setCookie }) }));
beforeEach(() => {
  setCookie.mockClear();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("WEB_SESSION_COOKIE_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
  vi.stubEnv("API_BASE_URL", "https://api.example.com");
});
it("cifra com IV aleatório e rejeita adulteração e expiração", () => {
  const session = { tokens: { accessToken: "access", refreshToken: "refresh", tokenType: "Bearer" as const }, expiresAt: Date.now() + 60000 };
  const first = encryptWebSession(session);
  const second = encryptWebSession(session);
  expect(first).not.toBe(second);
  expect(first).not.toContain("access");
  expect(decryptWebSession(first)).toEqual(session);
  const bytes = Buffer.from(first, "base64url"); bytes[30] ^= 1;
  expect(decryptWebSession(bytes.toString("base64url"))).toBeNull();
  expect(decryptWebSession(encryptWebSession({ ...session, expiresAt: Date.now() - 1 }))).toBeNull();
});
it("mudança de chave invalida cookies e chaves curtas são rejeitadas", () => {
  const value = encryptWebSession({ tokens: { accessToken: "a", refreshToken: "r", tokenType: "Bearer" }, expiresAt: Date.now() + 60000 });
  vi.stubEnv("WEB_SESSION_COOKIE_ENCRYPTION_KEY", Buffer.alloc(32, 8).toString("base64"));
  expect(decryptWebSession(value)).toBeNull();
  vi.stubEnv("WEB_SESSION_COOKIE_ENCRYPTION_KEY", Buffer.alloc(31).toString("base64"));
  expect(() => decryptWebSession(value)).toThrow("32 bytes");
});
it("rejeita cookie acima de 3800 bytes", () => {
  expect(() => encryptWebSession({ tokens: { accessToken: "a".repeat(4000), refreshToken: "r", tokenType: "Bearer" }, expiresAt: Date.now() + 60000 })).toThrow("size limit");
});
it("login limita a sessão a quinze dias mesmo com refresh mais longo", async () => {
  const now = Date.now();
  await createWebSession({ accessToken: token(now + 900000), refreshToken: token(now + 30 * 86400000), tokenType: "Bearer" });
  const [name, value, options] = setCookie.mock.calls[0];
  expect(name).toBe("grp-session");
  expect(decryptWebSession(value)?.expiresAt).toBeLessThanOrEqual(now + 15 * 86400000 + 50);
  expect(options).toMatchObject({ httpOnly: true, secure: false, sameSite: "lax", path: "/" });
  vi.stubEnv("NODE_ENV", "production");
  expect(sessionCookieOptions(now)).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
});
it("decodifica os dois cookies de auth e encaminha apenas o token necessário", () => {
  const headers = new Headers();
  headers.append("Set-Cookie", "grp-access=access; HttpOnly");
  headers.append("Set-Cookie", "grp-refresh=refresh; HttpOnly");
  expect(decodeTokenPairFromSetCookie(headers)).toEqual({ accessToken: "access", refreshToken: "refresh", tokenType: "Bearer" });
  expect(apiAccessCookie("a")).toBe("grp-access=a");
  expect(apiRefreshCookie("r")).toBe("grp-refresh=r");
  expect(() => decodeTokenPairFromSetCookie(new Headers())).toThrow();
});
it("duas renovações concorrentes compartilham uma chamada e o mesmo par", async () => {
  let finish!: (value: Response) => void;
  const fetch = vi.fn<typeof globalThis.fetch>(() => new Promise<Response>((resolve) => { finish = resolve; }));
  vi.stubGlobal("fetch", fetch);
  const first = refreshWebTokens("same-refresh");
  const second = refreshWebTokens("same-refresh");
  const headers = new Headers(); headers.append("Set-Cookie", "grp-access=new-access"); headers.append("Set-Cookie", "grp-refresh=new-refresh");
  finish(new Response(null, { status: 204, headers }));
  expect(await first).toEqual({ ok: true, data: { accessToken: "new-access", refreshToken: "new-refresh", tokenType: "Bearer" } });
  expect(await second).toEqual(await first);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][1]).toMatchObject({ method: "POST", headers: { Cookie: "grp-refresh=same-refresh" }, cache: "no-store" });
});
it.each(["https://evil.example", "//evil.example", "/%2f%2fevil.example", "/%255cevil", "/systems/../login", "/systems\\evil", "/other"]) ("rejeita redirect externo ou desconhecido %s", (candidate) => {
  expect(safeNextPath(candidate)).toBe("/systems");
});
it("aceita uma rota privada conhecida e trata JWT inválido", () => {
  expect(safeNextPath(`/records/${id}/edit`)).toBe(`/records/${id}/edit`);
  expect(getTokenExpiry("invalid")).toBeNull();
});
