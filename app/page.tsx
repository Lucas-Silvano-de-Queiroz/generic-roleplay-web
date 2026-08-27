import Link from "next/link";
import { Button } from "@/app/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Generic Roleplay Web
        </h1>
        <p className="max-w-md text-muted-foreground">
          Crie sua conta para começar sua aventura.
        </p>
      </div>

      <Button asChild size="lg">
        <Link href="/register">Criar conta</Link>
      </Button>
    </main>
  );
}
