"use server";

import { redirect } from "next/navigation";
import type { LoginState } from "@/lib/types";

const LOGIN_API_URL = "https://generic-roleplay-api.vercel.app/auth/login";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function loginUser(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const errors: LoginState["errors"] = {};

  if (!email.trim()) {
    errors.email = "Informe seu e-mail.";
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = "Informe um e-mail válido.";
  }

  if (!password) {
    errors.password = "Informe sua senha.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const response = await fetch(LOGIN_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  if (!response.ok) {
    return {
      message:
        "Não foi possível entrar. Verifique suas credenciais e tente novamente.",
    };
  }

  redirect("/");
}