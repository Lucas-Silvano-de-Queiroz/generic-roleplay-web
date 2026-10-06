"use server";
import { redirect } from "next/navigation";
import { requestApiTransport } from "@/lib/api/transport";
import { apiRefreshCookie } from "@/lib/api/auth-cookies";
import { destroyWebSession, readWebSession } from "@/lib/auth/session";

export async function logoutUser(): Promise<void> {
  const session = await readWebSession();
  const result = session
    ? await requestApiTransport<void>("/auth/logout", { method: "POST", cookie: apiRefreshCookie(session.tokens.refreshToken) })
    : undefined;
  await destroyWebSession();
  if (result && !result.ok && ![401, 404].includes(result.error.statusCode ?? 0)) redirect("/login?logout=local");
  redirect("/login?logout=done");
}
