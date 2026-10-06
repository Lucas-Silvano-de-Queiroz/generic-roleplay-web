"use client";
import { Button } from "@/app/components/ui/button";
export default function AuthenticatedError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert" className="rounded-2xl border border-destructive/30 bg-card p-6"><h1 className="text-xl font-medium">Não foi possível carregar esta página.</h1><p className="mt-2 text-sm text-muted-foreground">Tente novamente. Seus dados não foram alterados.</p><Button type="button" variant="outline" className="mt-4" onClick={reset}>Tentar novamente</Button></section>;
}
