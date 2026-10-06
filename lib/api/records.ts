import "server-only";
import { apiRequest } from "@/lib/api/client";
import { decodeRecord, decodeRecordPage, isUuid, type CreateRecord, type ListRecordsQuery, type RecordPage, type RpgRecord, type UpdateRecord } from "@/lib/api/contracts";
import type { ApiResult } from "@/lib/api/errors";
export const listRecords = (templateId: string, query: ListRecordsQuery = {}) => {
  if (!isUuid(templateId) || (query.cursor !== undefined && !isUuid(query.cursor)) || (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 100))) return Promise.resolve<ApiResult<RecordPage>>({ ok: false, error: { kind: "invalid-response", message: "Invalid record query" } });
  const params = new URLSearchParams({ limit: String(query.limit ?? 50) });
  if (query.cursor) params.set("cursor", query.cursor);
  return apiRequest<RecordPage>(`/rpg-templates/${templateId}/records?${params}`, { method: "GET", auth: "session", parseResponse: decodeRecordPage });
};
export const getRecord = (id: string) => isUuid(id) ? apiRequest<RpgRecord>(`/rpg-records/${id}`, { method: "GET", auth: "session", parseResponse: decodeRecord }) : Promise.resolve<ApiResult<RpgRecord>>({ ok: false, error: { kind: "invalid-response", message: "Invalid record identifier" } });
export const createRecord = (templateId: string, input: CreateRecord) => isUuid(templateId) ? apiRequest<RpgRecord>(`/rpg-templates/${templateId}/records`, { method: "POST", auth: "session", body: input, parseResponse: decodeRecord }) : Promise.resolve<ApiResult<RpgRecord>>({ ok: false, error: { kind: "invalid-response", message: "Invalid template identifier" } });
export const updateRecord = (id: string, input: UpdateRecord) => isUuid(id) ? apiRequest<RpgRecord>(`/rpg-records/${id}`, { method: "PATCH", auth: "session", body: input, parseResponse: decodeRecord }) : Promise.resolve<ApiResult<RpgRecord>>({ ok: false, error: { kind: "invalid-response", message: "Invalid record identifier" } });
export const deleteRecord = (id: string) => isUuid(id) ? apiRequest<void>(`/rpg-records/${id}`, { method: "DELETE", auth: "session" }) : Promise.resolve<ApiResult<void>>({ ok: false, error: { kind: "invalid-response", message: "Invalid record identifier" } });
