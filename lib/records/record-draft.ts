import type { FieldDefinition, RecordValues } from "@/lib/api/contracts";
import type { ValidationResult } from "@/lib/forms/state";
import { validateRecordValues } from "@/lib/validation/records";
export type RecordFieldDraft = { included: boolean; value: string };
export function buildRecordValues(fields: readonly FieldDefinition[], draft: Record<string, RecordFieldDraft>): ValidationResult<RecordValues> {
  const entries: Array<[string, string]> = [];
  for (const field of fields) {
    const value = draft[field.key];
    if (field.required || value?.included) entries.push([field.key, value?.value ?? ""]);
  }
  return validateRecordValues(Object.fromEntries(entries), fields);
}
export function recordSchemaFingerprint(fields: readonly FieldDefinition[]): string { return JSON.stringify(fields); }
