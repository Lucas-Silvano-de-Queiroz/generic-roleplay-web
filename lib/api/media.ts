import "server-only";
import { apiRequest } from "@/lib/api/client";
import type { ApiResult } from "@/lib/api/errors";
import { isUuid } from "@/lib/api/contracts";
import { decodeCover, decodeMediaList, type MediaImage } from "@/lib/media/contracts";

export const getSystemCover = (id: string): Promise<ApiResult<{ image: MediaImage | null }>> =>
  isUuid(id) ? apiRequest(`/rpg-systems/${id}/cover`, { method: "GET", auth: "session", parseResponse: decodeCover }) : Promise.resolve<ApiResult<{ image: MediaImage | null }>>({ ok: false, error: { kind: "invalid-response", message: "Invalid system identifier" } });

export const getCollectionCover = (id: string): Promise<ApiResult<{ image: MediaImage | null }>> =>
  isUuid(id) ? apiRequest(`/rpg-collections/${id}/cover`, { method: "GET", auth: "session", parseResponse: decodeCover }) : Promise.resolve<ApiResult<{ image: MediaImage | null }>>({ ok: false, error: { kind: "invalid-response", message: "Invalid collection identifier" } });

export const getRecordImages = (id: string): Promise<ApiResult<{ items: MediaImage[] }>> =>
  isUuid(id) ? apiRequest(`/rpg-records/${id}/images`, { method: "GET", auth: "session", parseResponse: (value) => ({ items: decodeMediaList(value) }) }) : Promise.resolve<ApiResult<{ items: MediaImage[] }>>({ ok: false, error: { kind: "invalid-response", message: "Invalid record identifier" } });
