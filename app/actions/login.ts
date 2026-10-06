"use server";

import { redirect } from "next/navigation";
import { requestApiTransport } from "@/lib/api/transport";
import { apiRefreshCookie, decodeTokenPairFromSetCookie } from "@/lib/api/auth-cookies";
import { mapApiError } from "@/lib/api/errors";
import { createWebSession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/redirect-target";
import { formString } from "@/lib/forms/state";
import { validateLogin } from "@/lib/validation/identity";
import type { LoginState } from "@/lib/types";

export async function loginUser(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const validation = validateLogin({ email: formString(formData, "email"), password: formString(formData, "password") });
  if (!validation.valid) return { fieldErrors: validation.fieldErrors, errors: validation.fieldErrors };
  const result = await requestApiTransport("/auth/login", { method: "POST", body: validation.data, parseResponseHeaders: decodeTokenPairFromSetCookie });
  if (!result.ok) {
    const failure = result.error.statusCode === 401 ? { message: "E-mail ou senha incorretos." } : mapApiError(result.error);
    return { ...failure, errors: failure.fieldErrors };
  }
  try { await createWebSession(result.data); }
  catch {
    await requestApiTransport<void>("/auth/logout", { method: "POST", cookie: apiRefreshCookie(result.data.refreshToken) });
    return { message: "Não foi possível iniciar uma sessão segura. Tente novamente em instantes." };
  }
  redirect(safeNextPath(formString(formData, "next")));
}
