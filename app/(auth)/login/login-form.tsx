"use client";

import { useActionState } from "react";
import { loginUser } from "@/app/actions/login";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import type { LoginState } from "@/lib/types";
import { FormAlert } from "@/app/components/forms/form-alert";
import { FocusFirstError } from "@/app/components/forms/focus-first-error";

const initialState: LoginState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(
    loginUser,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FocusFirstError errors={state.fieldErrors} />
      {next && <input type="hidden" name="next" value={next} />}
      <FormAlert state={state} />

      <Input
        type="email"
        name="email"
        label="Email"
        placeholder="voce@exemplo.com"
        autoComplete="email"
        required
        error={state.fieldErrors?.email ?? state.errors?.email}
      />

      <Input
        type="password"
        name="password"
        label="Senha"
        placeholder="Sua senha"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password ?? state.errors?.password}
      />

      <Button
        type="submit"
        size="lg"
        variant="outline"
        loading={pending}
        className="mt-2 w-full"
      >
        Entrar
      </Button>
    </form>
  );
}
