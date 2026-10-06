import type { ApiFailure, ApiResult } from "@/lib/api/errors";
import { isUuid, type UUID } from "@/lib/api/contracts";
export function validateId<T>(id: string): ApiResult<T> | null {
  return isUuid(id) ? null : { ok: false, error: { kind: "invalid-response", message: "Invalid resource identifier" } satisfies ApiFailure };
}
export function pathId(id: UUID) { return encodeURIComponent(id); }
