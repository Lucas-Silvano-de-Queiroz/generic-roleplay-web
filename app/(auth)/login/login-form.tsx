"use client";

import { useActionState } from "react";
import { motion } from "motion/react";
import { loginUser } from "@/app/actions/login";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import type { LoginState } from "@/lib/types";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginUser,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.message && (
        <motion.div
          key="error"
          role="alert"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, x: [0, -8, 8, -6, 6, 0] }}
          transition={{ duration: 0.4 }}
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.message}
        </motion.div>
      )}

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
        placeholder="Sua senha"
        autoComplete="current-password"
        required
        error={state.errors?.password}
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