"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSystem, deleteSystem, getSystem, updateSystem } from "@/lib/api/systems";
import { mapApiError } from "@/lib/api/errors";
import type { FormState } from "@/lib/forms/state";
import { formString } from "@/lib/forms/state";
import { validateCreateSystem, validateUpdateSystem } from "@/lib/validation/content";

export async function createSystemAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const validation = validateCreateSystem({ name: formString(formData, "name"), description: formString(formData, "description") });
  if (!validation.valid) return { fieldErrors: validation.fieldErrors };
  const result = await createSystem(validation.data);
  if (!result.ok) return { ...mapApiError(result.error), fieldErrors: mapApiError(result.error).fieldErrors };
  revalidatePath("/systems");
  redirect(`/systems/${result.data.id}`);
}
export async function updateSystemAction(id: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const current = await getSystem(id);
  if (!current.ok) return mapApiError(current.error);
  const validation = validateUpdateSystem({ name: formString(formData, "name"), description: formString(formData, "description") });
  if (!validation.valid) return { fieldErrors: validation.fieldErrors };
  const patch: Record<string, string> = {};
  if (validation.data.name !== current.data.name) patch.name = validation.data.name!;
  const nextDescription = validation.data.description ?? "";
  if (nextDescription !== (current.data.description ?? "")) patch.description = nextDescription;
  if (!Object.keys(patch).length) redirect(`/systems/${id}`);
  const result = await updateSystem(id, patch);
  if (!result.ok) return mapApiError(result.error);
  revalidatePath(`/systems/${id}`);
  revalidatePath("/systems");
  redirect(`/systems/${id}`);
}
export async function deleteSystemAction(id: string, previous: FormState, formData: FormData): Promise<FormState> {
  void previous; void formData;
  const result = await deleteSystem(id);
  if (!result.ok && result.error.statusCode === 404) {
    revalidatePath("/systems");
    redirect("/systems");
  }
  if (!result.ok) return mapApiError(result.error);
  revalidatePath("/systems");
  revalidatePath("/collections/[collectionId]", "page");
  revalidatePath("/collections/[collectionId]/edit", "page");
  revalidatePath("/templates/[templateId]", "page");
  revalidatePath("/templates/[templateId]/edit", "page");
  revalidatePath("/records/[recordId]", "page");
  revalidatePath("/records/[recordId]/edit", "page");
  redirect("/systems");
}
