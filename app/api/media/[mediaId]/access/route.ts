import type { NextRequest } from "next/server";
import { forward, isUuid, json, rejectQuery } from "@/lib/media/bff";
import { decodeImageAccess } from "@/lib/media/contracts";

export const runtime = "nodejs";
export async function GET(request: NextRequest, context: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await context.params;
  if (!isUuid(mediaId)) return json({ message: "Recurso não encontrado." }, 404);
  const queryError = rejectQuery(request);
  if (queryError) return queryError;
  return forward(`/media/${mediaId}/access`, "GET", undefined, decodeImageAccess);
}
