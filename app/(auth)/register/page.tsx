import Link from "next/link";
import { RevealOnMount } from "@/app/components/reveal";
import { RegisterForm } from "./register-form";
import { redirectAuthenticatedUser } from "@/lib/auth/session";

export default async function RegisterPage() {
  await redirectAuthenticatedUser();
  return (
    <RevealOnMount className="flex w-full max-w-sm flex-col gap-8">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Comece sua jornada
        </p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight">Criar conta</h1>
      </div>

      <RegisterForm />

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </RevealOnMount>
  );
}
