"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createRecord, deleteRecord, getRecord, updateRecord } from "@/lib/api/records";
import { getTemplate } from "@/lib/api/templates";
import type { FieldDefinition } from "@/lib/api/contracts";
import { mapApiError } from "@/lib/api/errors";
import type { FormState } from "@/lib/forms/state";
import { formString } from "@/lib/forms/state";
import { buildRecordValues, recordSchemaFingerprint, type RecordFieldDraft } from "@/lib/records/record-draft";

export type RecordFormState = FormState & { schemaChanged?: boolean; currentFields?: FieldDefinition[] };
function decodeDraft(formData: FormData): Record<string, RecordFieldDraft> | null {
  try {
    const value: unknown = JSON.parse(formString(formData, "draft"));
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    return value as Record<string, RecordFieldDraft>;
  } catch { return null; }
}
export async function createRecordAction(templateId: string, _previous: RecordFormState, formData: FormData): Promise<RecordFormState> {
  const template = await getTemplate(templateId);
  if (!template.ok) return mapApiError(template.error);
  if (formString(formData, "schemaFingerprint") !== recordSchemaFingerprint(template.data.fields)) return { schemaChanged: true, currentFields: template.data.fields, message: "A definição deste template mudou. Revise os campos antes de salvar." };
  const draft = decodeDraft(formData);
  if (!draft) return { message: "Não foi possível ler os valores do registro." };
  const validation = buildRecordValues(template.data.fields, draft);
  if (!validation.valid) return { fieldErrors: validation.fieldErrors };
  const result = await createRecord(templateId, { values: validation.data });
  if (!result.ok) return { ...mapApiError(result.error), fieldErrors: result.error.details?.reduce<Record<string, string>>((errors, detail) => { errors[detail.field.replace(/^values\./, "")] = detail.message; return errors; }, {}) };
  revalidatePath(`/templates/${templateId}`);
  redirect(`/records/${result.data.id}`);
}
export async function updateRecordAction(recordId: string, _previous: RecordFormState, formData: FormData): Promise<RecordFormState> {
  const record = await getRecord(recordId);
  if (!record.ok) return mapApiError(record.error);
  const template = await getTemplate(record.data.templateId);
  if (!template.ok) return mapApiError(template.error);
  if (formString(formData, "schemaFingerprint") !== recordSchemaFingerprint(template.data.fields)) return { schemaChanged: true, currentFields: template.data.fields, message: "A definição deste template mudou. Revise os campos antes de salvar." };
  const draft = decodeDraft(formData);
  if (!draft) return { message: "Não foi possível ler os valores do registro." };
  const validation = buildRecordValues(template.data.fields, draft);
  if (!validation.valid) return { fieldErrors: validation.fieldErrors };
  if (JSON.stringify(validation.data) === JSON.stringify(record.data.values)) redirect(`/records/${recordId}`);
  const result = await updateRecord(recordId, { values: validation.data });
  if (!result.ok) return { ...mapApiError(result.error), fieldErrors: result.error.details?.reduce<Record<string, string>>((errors, detail) => { errors[detail.field.replace(/^values\./, "")] = detail.message; return errors; }, {}) };
  revalidatePath(`/records/${recordId}`);
  revalidatePath(`/templates/${record.data.templateId}`);
  redirect(`/records/${recordId}`);
}
export async function deleteRecordAction(recordId: string, previous: FormState, formData: FormData): Promise<FormState> {
  void previous; void formData;
  const current = await getRecord(recordId);
  if (!current.ok) return mapApiError(current.error);
  const result = await deleteRecord(recordId);
  if (!result.ok && result.error.statusCode === 404) {
    revalidatePath(`/templates/${current.data.templateId}`);
    redirect(`/templates/${current.data.templateId}`);
  }
  if (!result.ok) return mapApiError(result.error);
  revalidatePath(`/templates/${current.data.templateId}`);
  redirect(`/templates/${current.data.templateId}`);
}
