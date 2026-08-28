"use client";

import { useActionState, useState } from "react";
import { registerUser } from "@/app/actions/register";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import type { RegisterState } from "@/lib/types";

const initialState: RegisterState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerUser,
    initialState
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsDiffer = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.message && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.message}
        </div>
      )}

      <Input
        type="text"
        name="name"
        label="Nome"
        placeholder="Seu nome"
        autoComplete="name"
        required
        error={state.errors?.name}
      />

      <Input
        type="email"
        name="email"
        label="Email"
        placeholder="voce@exemplo.com"
        autoComplete="email"
        required
        error={state.errors?.email}
      />

      <Input
        type="password"
        name="password"
        label="Senha"
        placeholder="Mínimo de 6 caracteres"
        autoComplete="new-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={state.errors?.password}
      />

      <Input
        type="password"
        name="confirmPassword"
        label="Confirmar senha"
        placeholder="Repita sua senha"
        autoComplete="new-password"
        required
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        error={
          passwordsDiffer
            ? "As senhas não coincidem."
            : state.errors?.confirmPassword
        }
      />

      <Button
        type="submit"
        size="lg"
        variant="outline"
        loading={pending}
        className="mt-2 w-full"
      >
        Cadastrar
      </Button>
    </form>
  );
}
