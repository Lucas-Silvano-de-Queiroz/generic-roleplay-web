import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { apiRequest } from "@/lib/api/client";
import type { ApiFailure } from "@/lib/api/errors";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 12 * 1024;

export function rejectCrossSite(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("Origin");
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  let expectedOrigin = request.nextUrl.origin;
  try {
    if (process.env.WEB_PUBLIC_ORIGIN) expectedOrigin = new URL(process.env.WEB_PUBLIC_ORIGIN).origin;
  } catch { return json({ message: "Serviço temporariamente indisponível." }, 503); }
  if (!origin || origin !== expectedOrigin || fetchSite === "cross-site") return json({ message: "Origem não autorizada." }, 403);
  return null;
}

export async function readJson(request: NextRequest): Promise<unknown | NextResponse> {
  const contentType = request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase();
  const length = request.headers.get("Content-Length");
  if (contentType !== "application/json" || (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES))) return json({ message: "Requisição inválida." }, 400);
  if (!request.body) return json({ message: "Requisição inválida." }, 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); return json({ message: "Requisição muito grande." }, 413); }
      chunks.push(value);
    }
  } catch { return json({ message: "Requisição inválida." }, 400); }
  try {
    return JSON.parse(new TextDecoder().decode(concat(chunks, size))) as unknown;
  } catch { return json({ message: "Requisição inválida." }, 400); }
}

export function json(value: unknown, status = 200, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(value, { status, headers: { ...NO_STORE, ...headers } });
}

export async function forward<T>(path: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown, parseResponse?: (value: unknown) => T): Promise<NextResponse> {
  const result = await apiRequest<T>(path, { method, auth: "session", ...(body === undefined ? {} : { body }), ...(parseResponse ? { parseResponse } : {}) });
  if (result.ok) return method === "DELETE" ? new NextResponse(null, { status: 204, headers: NO_STORE }) : json(result.data);
  const status = failureStatus(result.error);
  const retry = result.error.retryAfterSeconds;
  return json({ message: localizedError(status) }, status, retry && retry > 0 ? { "Retry-After": String(Math.ceil(retry)) } : {});
}

export function invalidBody(value: unknown): boolean {
  return typeof value !== "object" || value === null || Array.isArray(value);
}

export function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function rejectQuery(request: NextRequest): NextResponse | null {
  return [...request.nextUrl.searchParams.keys()].length ? json({ message: "Parâmetros inválidos." }, 400) : null;
}

function concat(chunks: Uint8Array[], size: number): Uint8Array {
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

function failureStatus(error: ApiFailure): number {
  if (error.statusCode && error.statusCode >= 400 && error.statusCode <= 599) return error.statusCode;
  return error.kind === "network" || error.kind === "timeout" ? 503 : 502;
}

function localizedError(status: number): string {
  if (status === 400) return "Os dados da imagem são inválidos.";
  if (status === 401) return "Sua sessão expirou. Entre novamente.";
  if (status === 403) return "Origem não autorizada.";
  if (status === 404) return "Recurso não encontrado.";
  if (status === 409) return "Não foi possível concluir esta operação. Atualize as imagens e tente novamente.";
  if (status === 410) return "A autorização de envio expirou. Selecione a imagem novamente.";
  if (status === 413) return "A imagem excede o limite de 10 MiB.";
  if (status === 415 || status === 422) return "O arquivo não é uma imagem JPEG, PNG ou WebP válida.";
  if (status === 429) return "Muitas tentativas. Aguarde e tente novamente.";
  if (status === 503) return "O serviço de imagens está indisponível. Tente novamente.";
  return "Não foi possível concluir a operação. Seus dados foram mantidos.";
}
