import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Bem-vindo de volta
        </p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight">Entrar</h1>
      </div>

      <LoginForm />

      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link
          href="/register"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Cadastrar
        </Link>
      </p>
    </div>
  );
}