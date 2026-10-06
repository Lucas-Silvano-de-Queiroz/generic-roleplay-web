"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCollection, deleteCollection, getCollection, updateCollection } from "@/lib/api/collections";
import { mapApiError } from "@/lib/api/errors";
import type { FormState } from "@/lib/forms/state";
import { formString } from "@/lib/forms/state";
import { validateCreateCollection, validateUpdateCollection } from "@/lib/validation/content";

export async function createCollectionAction(systemId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const validation = validateCreateCollection({ name: formString(formData, "name"), description: formString(formData, "description"), identifier: formString(formData, "identifier") });
  if (!validation.valid) return { fieldErrors: validation.fieldErrors };
  const result = await createCollection(systemId, validation.data);
  if (!result.ok) return mapApiError(result.error);
  revalidatePath(`/systems/${systemId}`);
  redirect(`/collections/${result.data.id}`);
}
export async function updateCollectionAction(id: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const current = await getCollection(id);
  if (!current.ok) return mapApiError(current.error);
  const validation = validateUpdateCollection({ name: formString(formData, "name"), description: formString(formData, "description"), identifier: formString(formData, "identifier") });
  if (!validation.valid) return { fieldErrors: validation.fieldErrors };
  const patch: Record<string, string> = {};
  if (validation.data.name !== current.data.name) patch.name = validation.data.name!;
  const description = validation.data.description ?? "";
  if (description !== (current.data.description ?? "")) patch.description = description;
  if (validation.data.identifier !== current.data.identifier) patch.identifier = validation.data.identifier!;
  if (!Object.keys(patch).length) redirect(`/collections/${id}`);
  const result = await updateCollection(id, patch);
  if (!result.ok) return mapApiError(result.error);
  revalidatePath(`/collections/${id}`);
  revalidatePath(`/systems/${current.data.systemId}`);
  redirect(`/collections/${id}`);
}
export async function deleteCollectionAction(id: string, previous: FormState, formData: FormData): Promise<FormState> {
  void previous; void formData;
  const collection = await getCollection(id);
  if (!collection.ok) return mapApiError(collection.error);
  const systemId = collection.data.systemId;
  const result = await deleteCollection(id);
  if (!result.ok && result.error.statusCode === 404) {
    revalidatePath(`/systems/${systemId}`);
    redirect(`/systems/${systemId}`);
  }
  if (!result.ok) return mapApiError(result.error);
  revalidatePath(`/systems/${systemId}`);
  revalidatePath("/templates/[templateId]", "page");
  revalidatePath("/templates/[templateId]/edit", "page");
  revalidatePath("/records/[recordId]", "page");
  revalidatePath("/records/[recordId]/edit", "page");
  redirect(`/systems/${systemId}`);
}
