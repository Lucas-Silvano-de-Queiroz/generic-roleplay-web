"use server";

import { redirect } from "next/navigation";
import { decodeTokenPairFromSetCookie } from "@/lib/api/auth-cookies";
import { requestApiTransport } from "@/lib/api/transport";
import { createWebSession } from "@/lib/auth/session";
import type { FormState } from "@/lib/forms/state";

export async function signInImageDemo(_previous: FormState): Promise<FormState> {
  void _previous;
  if (process.env.NODE_ENV !== "development" || process.env.MEDIA_DEMO_ENABLED !== "true" || !process.env.MEDIA_DEMO_EMAIL || !process.env.MEDIA_DEMO_PASSWORD) {
    return { message: "A demonstração local não está habilitada." };
  }
  const result = await requestApiTransport("/auth/login", {
    method: "POST",
    body: { email: process.env.MEDIA_DEMO_EMAIL, password: process.env.MEDIA_DEMO_PASSWORD },
    parseResponseHeaders: decodeTokenPairFromSetCookie,
  });
  if (!result.ok) return { message: "Não foi possível entrar na demonstração. Confira se a API local está em execução." };
  await createWebSession(result.data);
  redirect("/demo/imagens");
}
