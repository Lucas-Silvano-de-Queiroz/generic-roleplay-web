import type { CreateCollection, CreateSystem, CreateTemplate, FieldDefinitionInput, UpdateCollection, UpdateSystem, UpdateTemplate } from "@/lib/api/contracts";
import type { ValidationResult } from "@/lib/forms/state";

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9_-]*$/;
type UnknownRecord = Record<string, unknown>;
function record(input: unknown): UnknownRecord { return typeof input === "object" && input !== null && !Array.isArray(input) ? input as UnknownRecord : {}; }
function isOnly(source: UnknownRecord, allowed: readonly string[]) { return Object.keys(source).every((key) => allowed.includes(key)); }
function nameErrors(source: UnknownRecord, fieldErrors: Record<string, string>) {
  if (typeof source.name !== "string" || source.name.length > 100 || !source.name.trim()) fieldErrors.name = "Informe um nome com até 100 caracteres.";
}
function description(source: UnknownRecord, fieldErrors: Record<string, string>, maximum = 5000) {
  if (source.description !== undefined && (typeof source.description !== "string" || source.description.length > maximum)) fieldErrors.description = `Use até ${maximum} caracteres.`;
}
function identifier(source: UnknownRecord, fieldErrors: Record<string, string>) {
  if (typeof source.identifier !== "string" || source.identifier.length > 64 || !IDENTIFIER_PATTERN.test(source.identifier)) fieldErrors.identifier = "Use 1 a 64 caracteres: comece com letra minúscula e use letras, números, _ ou -.";
}
function fields(source: UnknownRecord, fieldErrors: Record<string, string>, required: boolean): FieldDefinitionInput[] | undefined {
  if (source.fields === undefined && !required) return undefined;
  if (!Array.isArray(source.fields) || source.fields.length > 100) { fieldErrors.fields = "Adicione até 100 campos."; return undefined; }
  const keys = new Set<string>();
  const result: FieldDefinitionInput[] = [];
  source.fields.forEach((entry, index) => {
    const item = record(entry);
    const prefix = `fields.${index}`;
    if (!isOnly(item, ["key", "label", "description", "required", "maxLength", "format"])) fieldErrors[prefix] = "O campo contém propriedades inválidas.";
    if (typeof item.key !== "string" || item.key.length > 64 || !IDENTIFIER_PATTERN.test(item.key)) fieldErrors[`${prefix}.key`] = "Use uma chave válida de até 64 caracteres.";
    else if (keys.has(item.key)) fieldErrors[`${prefix}.key`] = "A chave deve ser única.";
    else keys.add(item.key);
    if (typeof item.label !== "string" || item.label.length > 100 || !item.label.trim()) fieldErrors[`${prefix}.label`] = "Informe um rótulo com até 100 caracteres.";
    if (item.description !== undefined && (typeof item.description !== "string" || item.description.length > 1000)) fieldErrors[`${prefix}.description`] = "Use até 1000 caracteres.";
    if (item.required !== undefined && typeof item.required !== "boolean") fieldErrors[`${prefix}.required`] = "Valor obrigatório inválido.";
    if (item.maxLength !== undefined && (!Number.isInteger(item.maxLength) || Number(item.maxLength) < 1 || Number(item.maxLength) > 100000)) fieldErrors[`${prefix}.maxLength`] = "Use um inteiro entre 1 e 100000.";
    if (item.format !== undefined && !["text", "textarea"].includes(String(item.format))) fieldErrors[`${prefix}.format`] = "Formato inválido.";
    result.push({ key: String(item.key ?? ""), label: String(item.label ?? "").trim(), ...(typeof item.description === "string" ? { description: item.description } : {}), ...(typeof item.required === "boolean" ? { required: item.required } : {}), ...(typeof item.maxLength === "number" ? { maxLength: item.maxLength } : {}), ...(item.format === "text" || item.format === "textarea" ? { format: item.format } : {}) });
  });
  return result;
}
function validateContent<T>(input: unknown, kind: "system" | "collection" | "template", partial: boolean): ValidationResult<T> {
  const source = record(input);
  const fieldErrors: Record<string, string> = {};
  const allowed = kind === "system" ? ["name", "description"] : kind === "collection" ? ["name", "description", "identifier"] : ["name", "description", "identifier", "category", "fields"];
  if (!isOnly(source, allowed)) fieldErrors.form = "Dados inválidos.";
  if (!partial || source.name !== undefined) nameErrors(source, fieldErrors);
  description(source, fieldErrors);
  if (kind !== "system" && (!partial || source.identifier !== undefined)) identifier(source, fieldErrors);
  let normalizedFields: FieldDefinitionInput[] | undefined;
  if (kind === "template" && (source.fields !== undefined || !partial)) normalizedFields = fields(source, fieldErrors, true) ?? [];
  if (kind === "template" && source.category !== undefined && (typeof source.category !== "string" || source.category.length > 64)) fieldErrors.category = "Use até 64 caracteres.";
  if (Object.keys(fieldErrors).length) return { valid: false, fieldErrors };
  const data: UnknownRecord = {};
  for (const key of allowed) {
    if (source[key] === undefined) continue;
    data[key] = key === "name" && typeof source.name === "string" ? source.name.trim() : source[key];
  }
  if (normalizedFields !== undefined) data.fields = normalizedFields;
  return { valid: true, data: data as T };
}
export const validateCreateSystem = (input: unknown) => validateContent<CreateSystem>(input, "system", false);
export const validateUpdateSystem = (input: unknown) => validateContent<UpdateSystem>(input, "system", true);
export const validateCreateCollection = (input: unknown) => validateContent<CreateCollection>(input, "collection", false);
export const validateUpdateCollection = (input: unknown) => validateContent<UpdateCollection>(input, "collection", true);
export const validateCreateTemplate = (input: unknown) => validateContent<CreateTemplate>(input, "template", false);
export const validateUpdateTemplate = (input: unknown) => validateContent<UpdateTemplate>(input, "template", true);
export { IDENTIFIER_PATTERN };
