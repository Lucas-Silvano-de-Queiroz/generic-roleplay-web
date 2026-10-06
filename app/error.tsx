"use client";
import { Button } from "@/app/components/ui/button";
export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-4 text-center" role="alert">
    <h1 className="text-2xl font-medium">Não foi possível carregar esta página.</h1>
    <p className="mt-2 text-sm text-muted-foreground">Tente novamente em instantes.</p>
    <Button type="button" variant="outline" className="mt-5" onClick={reset}>Tentar novamente</Button>
  </main>;
}
