"use server";

import { redirect } from "next/navigation";
import type { RegisterState } from "@/lib/types";

const REGISTER_API_URL = "https://generic-roleplay-api.vercel.app/users";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerUser(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const errors: RegisterState["errors"] = {};

  if (!name.trim()) {
    errors.name = "Informe seu nome.";
  }

  if (!email.trim()) {
    errors.email = "Informe seu e-mail.";
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = "Informe um e-mail válido.";
  }

  if (!password) {
    errors.password = "Informe uma senha.";
  } else if (password.length < 6) {
    errors.password = "A senha deve ter pelo menos 6 caracteres.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "As senhas não coincidem.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const response = await fetch(REGISTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim(),
      password,
    }),
  });

  if (!response.ok) {
    return {
      message:
        "Não foi possível concluir o cadastro. Verifique os dados e tente novamente.",
    };
  }

  redirect("/");
}