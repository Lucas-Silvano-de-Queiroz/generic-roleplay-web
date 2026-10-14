import { NextResponse, type NextRequest } from "next/server";
import { forward, hasOnlyKeys, invalidBody, json, readJson, rejectCrossSite, rejectQuery, isUuid } from "@/lib/media/bff";
import { decodeMediaImage } from "@/lib/media/contracts";

export const runtime = "nodejs";
export async function POST(request: NextRequest, context: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await context.params;
  if (!isUuid(mediaId)) return json({ message: "Recurso não encontrado." }, 404);
  const originError = rejectCrossSite(request);
  if (originError) return originError;
  const queryError = rejectQuery(request);
  if (queryError) return queryError;
  const body = await readJson(request);
  if (body instanceof NextResponse) return body;
  if (invalidBody(body) || !hasOnlyKeys(body as Record<string, unknown>, [])) return json({ message: "Os dados da imagem são inválidos." }, 400);
  return forward(`/media/${mediaId}/complete`, "POST", {}, decodeMediaImage);
}
