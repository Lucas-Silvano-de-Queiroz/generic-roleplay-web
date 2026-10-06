import { AuthenticatedShell } from "@/app/components/authenticated-shell";
import { requireSession } from "@/lib/auth/session";
import type { ReactNode } from "react";

export default async function AuthenticatedLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireSession();
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
