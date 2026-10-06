import "server-only";
import { apiRequest } from "@/lib/api/client";
import { decodeSystem, decodeSystemList, isUuid, type CreateSystem, type RpgSystem, type UpdateSystem } from "@/lib/api/contracts";
import type { ApiResult } from "@/lib/api/errors";
export const listSystems = () => apiRequest<RpgSystem[]>("/rpg-systems", { method: "GET", auth: "session", parseResponse: decodeSystemList });
export const getSystem = (id: string) => isUuid(id) ? apiRequest<RpgSystem>(`/rpg-systems/${id}`, { method: "GET", auth: "session", parseResponse: decodeSystem }) : Promise.resolve<ApiResult<RpgSystem>>({ ok: false, error: { kind: "invalid-response", message: "Invalid system identifier" } });
export const createSystem = (input: CreateSystem) => apiRequest<RpgSystem>("/rpg-systems", { method: "POST", auth: "session", body: input, parseResponse: decodeSystem });
export const updateSystem = (id: string, input: UpdateSystem) => isUuid(id) ? apiRequest<RpgSystem>(`/rpg-systems/${id}`, { method: "PATCH", auth: "session", body: input, parseResponse: decodeSystem }) : Promise.resolve<ApiResult<RpgSystem>>({ ok: false, error: { kind: "invalid-response", message: "Invalid system identifier" } });
export const deleteSystem = (id: string) => isUuid(id) ? apiRequest<void>(`/rpg-systems/${id}`, { method: "DELETE", auth: "session" }) : Promise.resolve<ApiResult<void>>({ ok: false, error: { kind: "invalid-response", message: "Invalid system identifier" } });
