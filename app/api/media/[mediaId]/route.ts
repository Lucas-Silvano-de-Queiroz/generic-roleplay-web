import type { NextRequest } from "next/server";
import { forward, hasOnlyKeys, invalidBody, json, readJson, rejectCrossSite, rejectQuery, isUuid } from "@/lib/media/bff";
import { decodeMediaImage } from "@/lib/media/contracts";

export const runtime = "nodejs";
export async function PATCH(request: NextRequest, context: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await context.params;
  if (!isUuid(mediaId)) return json({ message: "Recurso não encontrado." }, 404);
  const originError = rejectCrossSite(request);
  if (originError) return originError;
  const queryError = rejectQuery(request);
  if (queryError) return queryError;
  const body = await readJson(request);
  if (body instanceof Response) return body;
  if (invalidBody(body)) return json({ message: "Os dados da imagem são inválidos." }, 400);
  const source = body as Record<string, unknown>;
  if (!hasOnlyKeys(source, ["alt"]) || typeof source.alt !== "string" || source.alt.length > 500) return json({ message: "Os dados da imagem são inválidos." }, 400);
  return forward(`/media/${mediaId}`, "PATCH", source, decodeMediaImage);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await context.params;
  if (!isUuid(mediaId)) return json({ message: "Recurso não encontrado." }, 404);
  const originError = rejectCrossSite(request);
  if (originError) return originError;
  const queryError = rejectQuery(request);
  if (queryError) return queryError;
  if (request.body !== null || (request.headers.has("Content-Length") && Number(request.headers.get("Content-Length")) > 0)) return json({ message: "Requisição inválida." }, 400);
  return forward(`/media/${mediaId}`, "DELETE");
}
