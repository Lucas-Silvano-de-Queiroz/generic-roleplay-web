import { NextResponse, type NextRequest } from "next/server";
import { forward, hasOnlyKeys, invalidBody, json, readJson, rejectCrossSite, rejectQuery, isUuid } from "@/lib/media/bff";
import { decodeUploadAuthorization } from "@/lib/media/contracts";

export const runtime = "nodejs";
const CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const CHECKSUM = /^(?:[A-Za-z0-9+/]{4}){10}[A-Za-z0-9+/]{3}=$/;

export async function POST(request: NextRequest) {
  const originError = rejectCrossSite(request);
  if (originError) return originError;
  const queryError = rejectQuery(request);
  if (queryError) return queryError;
  const body = await readJson(request);
  if (body instanceof NextResponse) return body;
  if (!validReservation(body)) return json({ message: "Os dados da imagem são inválidos." }, 400);
  return forward("/media/uploads", "POST", body, decodeUploadAuthorization);
}

function validReservation(value: unknown): value is Record<string, unknown> {
  if (invalidBody(value)) return false;
  const source = value as Record<string, unknown>;
  if (!hasOnlyKeys(source, ["destination", "fileName", "contentType", "sizeBytes", "checksumSha256", "alt"])) return false;
  if (typeof source.fileName !== "string" || source.fileName.length < 1 || source.fileName.length > 255 || /[\u0000-\u001f\u007f]/u.test(source.fileName)) return false;
  if (typeof source.contentType !== "string" || !CONTENT_TYPES.includes(source.contentType)) return false;
  if (!Number.isInteger(source.sizeBytes) || Number(source.sizeBytes) < 1 || Number(source.sizeBytes) > 10 * 1024 * 1024) return false;
  if (typeof source.checksumSha256 !== "string" || !CHECKSUM.test(source.checksumSha256)) return false;
  if (source.alt !== undefined && (typeof source.alt !== "string" || source.alt.length > 500)) return false;
  if (invalidBody(source.destination)) return false;
  const destination = source.destination as Record<string, unknown>;
  if (destination.kind === "record-image") return hasOnlyKeys(destination, ["kind", "id"]) && isUuid(destination.id);
  if (destination.kind === "system-cover" || destination.kind === "collection-cover") return hasOnlyKeys(destination, ["kind", "id", "expectedCoverMediaId"]) && isUuid(destination.id) && (destination.expectedCoverMediaId === null || isUuid(destination.expectedCoverMediaId));
  return false;
}
