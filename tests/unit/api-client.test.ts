import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { requestApiTransport } from "@/lib/api/transport";
import { decodeUserCreated } from "@/lib/api/contracts";
import { id } from "../support/fixtures";

beforeEach(() => vi.stubEnv("API_BASE_URL", "https://api.example.com"));
afterEach(() => vi.useRealTimers());
it("DELETE 204 não tenta decodificar JSON", async () => {
  const response = new Response(null, { status: 204 });
  const json = vi.spyOn(response, "json");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  expect(await requestApiTransport("/resource", { method: "DELETE" })).toEqual({ ok: true, data: undefined });
  expect(json).not.toHaveBeenCalled();
});
it("recusa sucesso fora do contrato", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ id: 42 })));
  expect(await requestApiTransport("/users", { method: "POST", parseResponse: decodeUserCreated })).toMatchObject({ ok: false, error: { kind: "invalid-response" } });
});
it("requer decoder quando o sucesso contém JSON", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ private: "data" })));
  expect(await requestApiTransport("/resource", { method: "GET" })).toMatchObject({ ok: false, error: { kind: "invalid-response" } });
});
it("erro HTML conserva status e headers seguros", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<h1>unavailable</h1>", { status: 503, headers: { "X-Request-Id": "req-1", "Retry-After": "30" } })));
  expect(await requestApiTransport("/resource", { method: "GET" })).toMatchObject({ ok: false, error: { kind: "http", statusCode: 503, requestId: "req-1", retryAfterSeconds: 30 } });
});
it("resultado desconhecido da mutação executa apenas uma tentativa", async () => {
  const fetch = vi.fn().mockRejectedValue(new TypeError("network"));
  vi.stubGlobal("fetch", fetch);
  expect(await requestApiTransport("/users", { method: "POST", body: { name: "Pessoa" }, parseResponse: decodeUserCreated })).toMatchObject({ ok: false, error: { kind: "network" } });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("mede 102400 bytes de JSON UTF-8 sem truncar nem enviar 102401", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ id }));
  vi.stubGlobal("fetch", fetch);
  const body = { text: "✨" + "x".repeat(102386) }; // 11 bytes de estrutura + 3 + 102386.
  expect(await requestApiTransport("/users", { method: "POST", body, parseResponse: decodeUserCreated })).toEqual({ ok: true, data: { id } });
  expect(fetch.mock.calls[0][1]).toMatchObject({ body: JSON.stringify(body), cache: "no-store" });
  expect(await requestApiTransport("/users", { method: "POST", body: { text: body.text + "x" }, parseResponse: decodeUserCreated })).toMatchObject({ ok: false, error: { statusCode: 413 } });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("cancela uma requisição em dez segundos", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))));
  const result = requestApiTransport("/resource", { method: "GET" });
  await vi.advanceTimersByTimeAsync(10000);
  expect(await result).toMatchObject({ ok: false, error: { kind: "timeout" } });
});
it("conta bytes dos escapes JSON antes de enviar", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ id })); vi.stubGlobal("fetch", fetch);
  const body = { text: "\n".repeat(51194) + "x" };
  expect(await requestApiTransport("/users", { method: "POST", body, parseResponse: decodeUserCreated })).toEqual({ ok: true, data: { id } });
  expect(await requestApiTransport("/users", { method: "POST", body: { text: body.text + "x" }, parseResponse: decodeUserCreated })).toMatchObject({ ok: false, error: { statusCode: 413 } });
  expect(fetch).toHaveBeenCalledTimes(1);
});
