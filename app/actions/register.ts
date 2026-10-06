"use server";

import { redirect } from "next/navigation";
import { decodeUserCreated } from "@/lib/api/contracts";
import { apiRequest } from "@/lib/api/client";
import { mapApiError } from "@/lib/api/errors";
import { formString } from "@/lib/forms/state";
import { validateRegister } from "@/lib/validation/identity";
import type { RegisterState } from "@/lib/types";

export async function registerUser(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const password = formString(formData, "password");
  const validation = validateRegister({ name: formString(formData, "name"), email: formString(formData, "email"), password });
  const fieldErrors: NonNullable<RegisterState["fieldErrors"]> = validation.valid ? {} : validation.fieldErrors;
  if (password !== formString(formData, "confirmPassword")) fieldErrors.confirmPassword = "As senhas não coincidem.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, errors: fieldErrors };
  const result = await apiRequest("/users", { method: "POST", auth: "public", body: validation.valid ? validation.data : undefined, parseResponse: decodeUserCreated });
  if (!result.ok) {
    if (result.error.statusCode === 409 && result.error.message === "User already exists") {
      const emailError = { email: "Este e-mail já está cadastrado." };
      return { fieldErrors: emailError, errors: emailError };
    }
    const failure = mapApiError(result.error);
    return { ...failure, errors: failure.fieldErrors };
  }
  redirect("/login?registered=1");
}
