"use client";

import { useActionState } from "react";
import { Button } from "@/app/components/ui/button";
import { signInImageDemo } from "./actions";

export function DemoSignIn() {
  const [state, action, pending] = useActionState(signInImageDemo, {});
  return <form action={action} className="space-y-4">
    <p className="text-sm text-muted-foreground">Entre na conta de demonstração para experimentar a capa e a galeria com a imagem teste.jpg. Esta entrada troca a sessão atual por uma conta reservada para a demonstração.</p>
    <Button type="submit" loading={pending}>Entrar na demonstração</Button>
    {state.message && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
  </form>;
}
