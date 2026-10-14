import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/templates/[templateId]/records/route";
import { encryptWebSession } from "@/lib/auth/session";
import { id, record } from "../support/fixtures";

const { store } = vi.hoisted(() => ({ store: { get: vi.fn() } }));
vi.mock("next/headers", () => ({ cookies: async () => store }));
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("API_BASE_URL", "https://api.example.com");
  vi.stubEnv("WEB_SESSION_COOKIE_ENCRYPTION_KEY", Buffer.alloc(32, 1).toString("base64"));
  store.get.mockReturnValue({ value: encryptWebSession({ tokens: { accessToken: "access", refreshToken: "refresh", tokenType: "Bearer" }, expiresAt: Date.now() + 86400000 }) });
});
function request(query = "", templateId = id) {
  return GET(new NextRequest(`http://localhost/api/templates/${templateId}/records${query}`), { params: Promise.resolve({ templateId }) });
}
it.each(["?limit=1.5", "?limit=1e1", "?limit=0", "?limit=101", "?limit=50&limit=50", "?page=1", "?cursor=bad", `?cursor=${id}&cursor=${id}`])("rejeita query %s sem chamar API", async (query) => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const response = await request(query);
  expect(response.status).toBe(400); expect(fetch).not.toHaveBeenCalled();
});
it("UUID inválido não chama API", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  expect((await request("", "invalid")).status).toBe(404); expect(fetch).not.toHaveBeenCalled();
});
it("visitante recebe JSON 401 sem redirecionamento HTML", async () => {
  store.get.mockReturnValue(undefined); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const response = await request();
  expect(response.status).toBe(401); expect(response.headers.get("Content-Type")).toContain("application/json");
  expect(response.headers.get("Cache-Control")).toBe("no-store"); expect(fetch).not.toHaveBeenCalled();
});
it("encaminha somente access e query validada; devolve DTO sem tokens", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ items: [record], nextCursor: id })); vi.stubGlobal("fetch", fetch);
  const response = await request(`?limit=50&cursor=${id}`);
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ items: [record], nextCursor: id });
  expect(String(fetch.mock.calls[0][0])).toBe(`https://api.example.com/rpg-templates/${id}/records?limit=50&cursor=${id}`);
  expect(fetch.mock.calls[0][1].headers).toEqual({ Cookie: "grp-access=access" });
});
it.each([404, 429, 503])("preserva status %i sem detalhes internos", async (status) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "internal details" }, { status })));
  const response = await request();
  expect(response.status).toBe(status); expect(JSON.stringify(await response.json())).not.toContain("internal details");
});
