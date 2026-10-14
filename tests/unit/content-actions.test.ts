import { beforeEach, expect, it, vi } from "vitest";
import { createSystemAction, updateSystemAction } from "@/app/actions/systems";
import { updateTemplateAction } from "@/app/actions/templates";
import { createRecordAction, updateRecordAction } from "@/app/actions/records";
import { encryptWebSession } from "@/lib/auth/session";
import { recordSchemaFingerprint } from "@/lib/records/record-draft";
import { fields, formData, id, otherId, record, template } from "../support/fixtures";

const { store } = vi.hoisted(() => ({ store: { get: vi.fn(), set: vi.fn() } }));
vi.mock("next/headers", () => ({ cookies: async () => store }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("API_BASE_URL", "https://api.example.com");
  vi.stubEnv("WEB_SESSION_COOKIE_ENCRYPTION_KEY", Buffer.alloc(32, 1).toString("base64"));
  store.get.mockReturnValue({ value: encryptWebSession({ tokens: { accessToken: "access", refreshToken: "refresh", tokenType: "Bearer" }, expiresAt: Date.now() + 86400000 }) });
});
it("action privada valida sessão antes de processar formulário de visitante", async () => {
  store.get.mockReturnValue(undefined); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  await expect(createSystemAction({}, formData({}))).rejects.toThrow("REDIRECT:/login");
  expect(fetch).not.toHaveBeenCalled();
});
it("PATCH de nome do template omite fields e metadados inalterados", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json(template)).mockResolvedValueOnce(Response.json({ ...template, name: "Novo" })); vi.stubGlobal("fetch", fetch);
  await expect(updateTemplateAction(id, {}, formData({ name: "Novo", identifier: "sheet", description: "", category: "" }))).rejects.toThrow(`REDIRECT:/templates/${id}`);
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ name: "Novo" });
});
it("limpar descrição envia string vazia no PATCH", async () => {
  const system = { id, name: "Sistema", description: "Antiga", createdAt: template.createdAt, updatedAt: template.updatedAt };
  const fetch = vi.fn().mockResolvedValueOnce(Response.json(system)).mockResolvedValueOnce(Response.json({ ...system, description: "" })); vi.stubGlobal("fetch", fetch);
  await expect(updateSystemAction(id, {}, formData({ name: "Sistema", description: "" }))).rejects.toThrow(`REDIRECT:/systems/${id}`);
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ description: "" });
});
it("edição de registro substitui todos os values sem enviar IDs", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json(record)).mockResolvedValueOnce(Response.json(template)).mockResolvedValueOnce(Response.json({ ...record, values: { name: "Novo", notes: record.values.notes } })); vi.stubGlobal("fetch", fetch);
  await expect(updateRecordAction(id, {}, formData({ schemaFingerprint: recordSchemaFingerprint(fields), draft: JSON.stringify({ name: { included: true, value: "Novo" }, notes: { included: true, value: record.values.notes } }) }))).rejects.toThrow(`REDIRECT:/records/${id}`);
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ values: { name: "Novo", notes: "Material: visco\n\n✨" } });
});
it("mudança de schema retorna revisão sem mutação", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(template)); vi.stubGlobal("fetch", fetch);
  expect(await createRecordAction(id, {}, formData({ schemaFingerprint: "[]", draft: "{}" }))).toMatchObject({ schemaChanged: true, currentFields: fields });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("rejeita rascunho adulterado antes do POST", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json(template)).mockResolvedValueOnce(Response.json({ ...record, id: otherId })); vi.stubGlobal("fetch", fetch);
  const result = await createRecordAction(id, {}, formData({ schemaFingerprint: recordSchemaFingerprint(fields), draft: '{"name":{"included":true,"value":"Nome"},"notes":{"included":"yes","value":"texto"}}' }));
  expect(result).toHaveProperty("message");
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("corrida de schema na API oferece definição atual e preserva o rascunho", async () => {
  const changed = [{ ...fields[0], maxLength: 3 }, fields[1]];
  const fetch = vi.fn().mockResolvedValueOnce(Response.json(template)).mockResolvedValueOnce(Response.json({ message: "Invalid values", details: [{ field: "values.name", message: "Too long" }] }, { status: 400 })).mockResolvedValueOnce(Response.json({ ...template, fields: changed }));
  vi.stubGlobal("fetch", fetch);
  const result = await createRecordAction(id, {}, formData({ schemaFingerprint: recordSchemaFingerprint(fields), draft: JSON.stringify({ name: { included: true, value: "Nome longo" } }) }));
  expect(result).toMatchObject({ schemaChanged: true, currentFields: changed, fieldErrors: { name: expect.any(String) } });
  expect(fetch.mock.calls.filter(([, options]) => options.method === "POST")).toHaveLength(1);
});
