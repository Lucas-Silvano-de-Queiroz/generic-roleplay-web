import Link from "next/link";
import { logoutUser } from "@/app/actions/logout";
import { Button } from "@/app/components/ui/button";

export function AuthenticatedShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="relative z-10 flex min-h-dvh flex-col">
    <header className="border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/systems" className="font-medium tracking-tight">Generic Roleplay</Link>
        <nav aria-label="Navegação principal" className="flex items-center gap-2 sm:gap-4">
          <Link href="/systems" className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Sistemas</Link>
          <Link href="/settings/account" className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Conta</Link>
          <form action={logoutUser}><Button type="submit" variant="ghost" size="sm">Sair</Button></form>
        </nav>
      </div>
    </header>
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">{children}</main>
  </div>;
}
