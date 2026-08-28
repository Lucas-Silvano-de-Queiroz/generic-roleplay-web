import Link from "next/link";
import { Stagger, Reveal, RevealOnMount } from "@/app/components/reveal";
import { MotionButton } from "@/app/components/motion-button";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-10 px-4 text-center">
      <Stagger className="flex flex-col items-center gap-4">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            RPG · Roleplay
          </p>
        </Reveal>
        <Reveal>
          <h1 className="max-w-2xl text-[clamp(2.25rem,1.5rem+4vw,3.75rem)] font-medium tracking-tight">
            Generic Roleplay Web
          </h1>
        </Reveal>
        <Reveal>
          <p className="max-w-md text-muted-foreground">
            Crie sua conta para começar sua aventura.
          </p>
        </Reveal>
      </Stagger>

      <RevealOnMount delay={0.15}>
        <div className="flex w-full max-w-sm flex-col items-stretch gap-3 sm:w-auto sm:flex-row">
          <MotionButton
            asChild
            variant="outline"
            size="lg"
            buttonClassName="w-full sm:w-auto"
          >
            <Link href="/login">Entrar</Link>
          </MotionButton>
          <MotionButton
            asChild
            variant="outline"
            size="lg"
            buttonClassName="w-full sm:w-auto"
          >
            <Link href="/register">Cadastrar</Link>
          </MotionButton>
        </div>
      </RevealOnMount>
    </main>
  );
}