import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { decryptWebSession, encryptWebSession } from "@/lib/auth/session";
import { token } from "../support/fixtures";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("@/lib/auth/refresh", () => ({ refreshWebTokens: refresh }));
beforeEach(() => { refresh.mockReset(); vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("WEB_SESSION_COOKIE_ENCRYPTION_KEY", Buffer.alloc(32, 1).toString("base64")); });
function request(expiry: number) {
  const expiresAt = Date.now() + 86400000;
  return { expiresAt, request: new NextRequest("http://localhost/systems", { headers: { Cookie: `grp-session=${encryptWebSession({ tokens: { accessToken: token(expiry), refreshToken: "refresh", tokenType: "Bearer" }, expiresAt })}` } }) };
}
it("access fora da margem não renova", async () => {
  await proxy(request(Date.now() + 180000).request);
  expect(refresh).not.toHaveBeenCalled();
});
it("renova na margem e encaminha o novo cookie preservando expiração absoluta", async () => {
  const incoming = request(Date.now() + 60000);
  refresh.mockResolvedValue({ ok: true, data: { accessToken: token(Date.now() + 900000), refreshToken: "rotated", tokenType: "Bearer" } });
  const response = await proxy(incoming.request);
  expect(decryptWebSession(response.cookies.get("grp-session")?.value)).toMatchObject({ expiresAt: incoming.expiresAt, tokens: { refreshToken: "rotated" } });
  expect(response.headers.get("x-middleware-request-cookie")).toContain(response.cookies.get("grp-session")?.value);
});
it.each([401, 429, 503])("falha %i não apaga renovação concorrente", async (statusCode) => {
  refresh.mockResolvedValue({ ok: false, error: { kind: "http", statusCode, message: "failure" } });
  const response = await proxy(request(Date.now() + 1000).request);
  expect(response.cookies.get("grp-session")).toBeUndefined();
});
it("cookie adulterado é removido antes de encaminhar o request", async () => {
  const response = await proxy(new NextRequest("http://localhost/systems", { headers: { Cookie: "grp-session=invalid" } }));
  expect(response.cookies.get("grp-session")?.maxAge).toBe(0);
  expect(refresh).not.toHaveBeenCalled();
});
