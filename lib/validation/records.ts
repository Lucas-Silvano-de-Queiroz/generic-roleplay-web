import type { FieldDefinition, RecordValues } from "@/lib/api/contracts";
import type { ValidationResult } from "@/lib/forms/state";

export function validateRecordValues(values: unknown, fields: readonly FieldDefinition[]): ValidationResult<RecordValues> {
  if (typeof values !== "object" || values === null || Array.isArray(values)) return { valid: false, fieldErrors: { form: "Informe os valores do registro." } };
  const source = values as Record<string, unknown>;
  const allowed = new Set(fields.map((field) => field.key));
  const fieldErrors: Record<string, string> = {};
  for (const key of Object.keys(source)) if (!allowed.has(key)) fieldErrors[key] = "Este campo não pertence à definição atual.";
  const result: RecordValues = Object.create(null) as RecordValues;
  for (const field of fields) {
    if (!Object.hasOwn(source, field.key)) {
      if (field.required) fieldErrors[field.key] = "Este campo é obrigatório.";
      continue;
    }
    const value = source[field.key];
    if (typeof value !== "string") { fieldErrors[field.key] = "O valor deve ser texto."; continue; }
    if (field.required && !value.trim()) fieldErrors[field.key] = "Este campo é obrigatório.";
    if (value.length > Math.min(field.maxLength ?? 100000, 100000)) fieldErrors[field.key] = `Use até ${field.maxLength ?? 100000} caracteres.`;
    result[field.key] = value;
  }
  return Object.keys(fieldErrors).length ? { valid: false, fieldErrors } : { valid: true, data: result };
}
