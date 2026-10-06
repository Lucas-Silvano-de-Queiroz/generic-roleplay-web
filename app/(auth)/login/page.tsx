import Link from "next/link";
import { RevealOnMount } from "@/app/components/reveal";
import { LoginForm } from "./login-form";
import { redirectAuthenticatedUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/redirect-target";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; registered?: string; deleted?: string; logout?: string }> }) {
  await redirectAuthenticatedUser();
  const query = await searchParams;
  const next = query.next ? safeNextPath(query.next) : undefined;
  return (
    <RevealOnMount className="flex w-full max-w-sm flex-col gap-8">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Bem-vindo de volta
        </p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight">Entrar</h1>
      </div>

      {query.registered === "1" && <p role="status" className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm">Conta criada. Entre para continuar.</p>}
      {query.deleted === "1" && <p role="status" className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm">Conta excluída.</p>}
      {query.logout === "local" && <p role="status" className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm">Você saiu deste navegador. Não foi possível confirmar o encerramento da sessão no servidor.</p>}
      {query.logout === "done" && <p role="status" className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm">Você saiu da sua conta.</p>}
      <LoginForm next={next} />

      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link
          href="/register"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Cadastrar
        </Link>
      </p>
    </RevealOnMount>
  );
}
