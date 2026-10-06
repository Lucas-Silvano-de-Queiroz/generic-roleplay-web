"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FieldDefinitionInput, UpdateTemplate } from "@/lib/api/contracts";
import { createTemplate, deleteTemplate, getTemplate, updateTemplate } from "@/lib/api/templates";
import { mapApiError } from "@/lib/api/errors";
import type { FormState } from "@/lib/forms/state";
import { formString } from "@/lib/forms/state";
import { validateCreateTemplate, validateUpdateTemplate } from "@/lib/validation/content";

function extractFields(formData: FormData): unknown {
  const raw = formString(formData, "fields");
  try { const parsed: unknown = JSON.parse(raw); return parsed; } catch { return null; }
}
export async function createTemplateAction(collectionId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const validation = validateCreateTemplate({ name: formString(formData, "name"), description: formString(formData, "description"), identifier: formString(formData, "identifier"), category: formString(formData, "category"), fields: extractFields(formData) });
  if (!validation.valid) return { fieldErrors: validation.fieldErrors };
  const result = await createTemplate(collectionId, validation.data);
  if (!result.ok) return mapApiError(result.error);
  revalidatePath(`/collections/${collectionId}`);
  redirect(`/templates/${result.data.id}`);
}
export async function updateTemplateAction(id: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const current = await getTemplate(id);
  if (!current.ok) return mapApiError(current.error);
  const fieldsValue = formData.has("fields") ? extractFields(formData) : undefined;
  const validation = validateUpdateTemplate({ name: formString(formData, "name"), description: formString(formData, "description"), identifier: formString(formData, "identifier"), category: formString(formData, "category"), ...(formData.has("fields") ? { fields: fieldsValue } : {}) });
  if (!validation.valid) return { fieldErrors: validation.fieldErrors };
  const patch: UpdateTemplate = {};
  if (validation.data.name !== current.data.name) patch.name = validation.data.name;
  const description = validation.data.description ?? "";
  if (description !== (current.data.description ?? "")) patch.description = description;
  if (validation.data.identifier !== current.data.identifier) patch.identifier = validation.data.identifier;
  const category = validation.data.category ?? "";
  if (category !== (current.data.category ?? "")) patch.category = category;
  if (validation.data.fields && JSON.stringify(validation.data.fields) !== JSON.stringify(current.data.fields)) patch.fields = validation.data.fields as FieldDefinitionInput[];
  if (!Object.keys(patch).length) redirect(`/templates/${id}`);
  const result = await updateTemplate(id, patch);
  if (!result.ok) return { ...mapApiError(result.error), fieldErrors: mapApiError(result.error).fieldErrors };
  revalidatePath(`/templates/${id}`);
  revalidatePath(`/collections/${current.data.collectionId}`);
  redirect(`/templates/${id}`);
}
export async function deleteTemplateAction(id: string, previous: FormState, formData: FormData): Promise<FormState> {
  void previous; void formData;
  const template = await getTemplate(id);
  if (!template.ok) return mapApiError(template.error);
  const collectionId = template.data.collectionId;
  const result = await deleteTemplate(id);
  if (!result.ok && result.error.statusCode === 404) {
    revalidatePath(`/collections/${collectionId}`);
    redirect(`/collections/${collectionId}`);
  }
  if (!result.ok) return mapApiError(result.error);
  revalidatePath(`/collections/${collectionId}`);
  revalidatePath("/records/[recordId]", "page");
  revalidatePath("/records/[recordId]/edit", "page");
  redirect(`/collections/${collectionId}`);
}
