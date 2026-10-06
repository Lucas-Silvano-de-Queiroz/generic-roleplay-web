"use server";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import { destroyWebSession } from "@/lib/auth/session";
import { formString } from "@/lib/forms/state";
import type { FormState } from "@/lib/forms/state";
import { mapApiError } from "@/lib/api/errors";
import { validateDeletePassword } from "@/lib/validation/identity";

export async function deleteAccount(_previous: FormState, formData: FormData): Promise<FormState> {
  const password = formString(formData, "password");
  if (formString(formData, "confirmed") !== "yes") return { fieldErrors: { confirmed: "Confirme a exclusão da conta para continuar." } };
  const validation = validateDeletePassword({ password });
  if (!validation.valid) return { fieldErrors: validation.fieldErrors };
  const result = await apiRequest<void>("/users/me", { method: "DELETE", auth: "session", body: validation.data });
  if (!result.ok) {
    if (result.error.statusCode === 401 && result.error.message === "Invalid credentials") return { fieldErrors: { password: "A senha está incorreta." } };
    if (result.error.statusCode === 401 && result.error.message === "Unauthorized") { await destroyWebSession(); redirect("/login?next=%2Fsettings%2Faccount"); }
    if (result.error.statusCode === 404) { await destroyWebSession(); redirect("/login"); }
    if (result.error.statusCode === 401) return { message: "Não foi possível confirmar a senha. Sua sessão foi mantida." };
    const failure = mapApiError(result.error);
    return result.error.statusCode === 429 ? failure : { ...failure, message: "Não foi possível confirmar a exclusão da conta. Seus dados continuam nesta tela." };
  }
  await destroyWebSession();
  redirect("/login?deleted=1");
}
