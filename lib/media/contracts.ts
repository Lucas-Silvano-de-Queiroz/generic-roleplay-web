import { isUuid } from "@/lib/api/contracts";

export type MediaDestinationKind = "system-cover" | "collection-cover" | "record-image";
export type MediaImage = {
  id: string;
  destination: { kind: MediaDestinationKind; id: string };
  fileName: string;
  alt: string;
  contentType: "image/webp";
  sizeBytes: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
};
export type UploadAuthorization = {
  id: string;
  state: "pending";
  upload: { method: "PUT"; url: string; headers: Record<string, string>; expiresAt: string };
  completeBefore: string;
};
export type ImageAccess = { id: string; url: string; expiresAt: string };

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid media response");
  return value as Record<string, unknown>;
}
function date(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}
function signedUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "::1", "localstack"].includes(url.hostname))) && !url.username && !url.password && !url.hash;
  } catch { return false; }
}

export function decodeMediaImage(value: unknown): MediaImage {
  const source = object(value);
  const destination = object(source.destination);
  if (!isUuid(source.id) || !isUuid(destination.id)) throw new Error("Invalid media identifier");
  if (!(["system-cover", "collection-cover", "record-image"] as unknown[]).includes(destination.kind)) throw new Error("Invalid media destination");
  if (typeof source.fileName !== "string" || typeof source.alt !== "string" || source.contentType !== "image/webp") throw new Error("Invalid media metadata");
  if (!Number.isInteger(source.sizeBytes) || Number(source.sizeBytes) < 1 || !Number.isInteger(source.width) || Number(source.width) < 1 || !Number.isInteger(source.height) || Number(source.height) < 1) throw new Error("Invalid media dimensions");
  if (!date(source.createdAt) || !date(source.updatedAt)) throw new Error("Invalid media dates");
  return { id: source.id, destination: { kind: destination.kind as MediaDestinationKind, id: destination.id }, fileName: source.fileName, alt: source.alt, contentType: "image/webp", sizeBytes: Number(source.sizeBytes), width: Number(source.width), height: Number(source.height), createdAt: source.createdAt, updatedAt: source.updatedAt };
}

export function decodeMediaList(value: unknown): MediaImage[] {
  const source = object(value);
  if (!Array.isArray(source.items)) throw new Error("Invalid media list");
  return source.items.map(decodeMediaImage);
}

export function decodeUploadAuthorization(value: unknown): UploadAuthorization {
  const source = object(value);
  const upload = object(source.upload);
  const headers = object(upload.headers);
  if (!isUuid(source.id) || source.state !== "pending" || upload.method !== "PUT" || !signedUrl(upload.url) || !date(upload.expiresAt) || !date(source.completeBefore)) throw new Error("Invalid upload authorization");
  if (typeof headers["content-type"] !== "string" || typeof headers["x-amz-checksum-sha256"] !== "string" || Object.keys(headers).some((key) => !["content-type", "x-amz-checksum-sha256"].includes(key.toLowerCase()))) throw new Error("Invalid upload headers");
  return { id: source.id, state: "pending", upload: { method: "PUT", url: upload.url, headers: { "content-type": headers["content-type"], "x-amz-checksum-sha256": headers["x-amz-checksum-sha256"] }, expiresAt: upload.expiresAt }, completeBefore: source.completeBefore };
}

export function decodeImageAccess(value: unknown): ImageAccess {
  const source = object(value);
  if (!isUuid(source.id) || !signedUrl(source.url) || !date(source.expiresAt)) throw new Error("Invalid image access response");
  return { id: source.id, url: source.url, expiresAt: source.expiresAt };
}

export function decodeCover(value: unknown): { image: MediaImage | null } {
  const source = object(value);
  return { image: source.image === null ? null : decodeMediaImage(source.image) };
}
