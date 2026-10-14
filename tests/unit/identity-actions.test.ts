import { beforeEach, expect, it, vi } from "vitest";
import { registerUser } from "@/app/actions/register";
import { loginUser } from "@/app/actions/login";
import { deleteAccount } from "@/app/actions/account";
import { logoutUser } from "@/app/actions/logout";
import { encryptWebSession } from "@/lib/auth/session";
import { formData, id, token } from "../support/fixtures";

const { store } = vi.hoisted(() => ({ store: { get: vi.fn(), set: vi.fn() } }));
vi.mock("next/headers", () => ({ cookies: async () => store }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
beforeEach(() => {
  store.get.mockReset(); store.set.mockReset();
  vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("API_BASE_URL", "https://api.example.com");
  vi.stubEnv("WEB_SESSION_COOKIE_ENCRYPTION_KEY", Buffer.alloc(32, 1).toString("base64"));
});
function session() {
  store.get.mockReturnValue({ value: encryptWebSession({ tokens: { accessToken: token(Date.now() + 900000), refreshToken: token(Date.now() + 86400000), tokenType: "Bearer" }, expiresAt: Date.now() + 86400000 }) });
}
it("cadastro envia somente o contrato e não autentica", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ id }, { status: 201 })); vi.stubGlobal("fetch", fetch);
  await expect(registerUser({}, formData({ name: "Pessoa", email: " A@EXAMPLE.COM ", password: "12345678", confirmPassword: "12345678" }))).rejects.toThrow("REDIRECT:/login?registered=1");
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ name: "Pessoa", email: "a@example.com", password: "12345678" });
  expect(store.set).not.toHaveBeenCalled();
});
it("senha curta e confirmação incorreta falham antes da rede", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const result = await registerUser({}, formData({ name: "Pessoa", email: "a@example.com", password: "1234567", confirmPassword: "different" }));
  expect(result.fieldErrors).toHaveProperty("password"); expect(result.fieldErrors).toHaveProperty("confirmPassword");
  expect(fetch).not.toHaveBeenCalled();
});
it("login persiste somente cookie cifrado antes de redirecionar", async () => {
  const headers = new Headers(); headers.append("Set-Cookie", `grp-access=${token(Date.now() + 900000)}`); headers.append("Set-Cookie", `grp-refresh=${token(Date.now() + 86400000)}`);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204, headers })));
  await expect(loginUser({}, formData({ email: "a@example.com", password: "password", next: "/settings/account" }))).rejects.toThrow("REDIRECT:/settings/account");
  expect(store.set).toHaveBeenCalledWith("grp-session", expect.any(String), expect.objectContaining({ httpOnly: true }));
});
it("senha incorreta na exclusão mantém sessão sem repetir ou renovar", async () => {
  session(); const fetch = vi.fn().mockResolvedValue(Response.json({ message: "Invalid credentials" }, { status: 401 })); vi.stubGlobal("fetch", fetch);
  expect(await deleteAccount({}, formData({ password: "wrongpass", confirmed: "yes" }))).toEqual({ fieldErrors: { password: "A senha está incorreta." } });
  expect(fetch).toHaveBeenCalledTimes(1); expect(store.set).not.toHaveBeenCalled();
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ password: "wrongpass" });
});
it("exclusão sem confirmação não chama a API", async () => {
  session(); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  expect((await deleteAccount({}, formData({ password: "password" }))).fieldErrors).toHaveProperty("confirmed");
  expect(fetch).not.toHaveBeenCalled();
});
it("logout com falha remota apaga o cookie e qualifica o resultado", async () => {
  session(); vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
  await expect(logoutUser()).rejects.toThrow("REDIRECT:/login?logout=local");
  expect(store.set).toHaveBeenCalledWith("grp-session", "", expect.objectContaining({ maxAge: 0 }));
});
