"use client";

import { useActionState } from "react";
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

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.message && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
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
        error={state.errors?.password}
      />

      <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
        Cadastrar
      </Button>
    </form>
  );
}
