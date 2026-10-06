import Link from "next/link";
import { listSystems } from "@/lib/api/systems";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { LocalDate } from "@/app/components/local-date";

export default async function SystemsPage() {
  const result = await listSystems();
  if (!result.ok) return <section role="alert"><h1 className="text-3xl font-medium">Seus sistemas</h1><p className="mt-4 text-muted-foreground">Não foi possível carregar seus sistemas. Tente novamente mais tarde.</p></section>;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">Sua biblioteca</p><h1 className="mt-1 text-3xl font-medium">Sistemas</h1></div><Button asChild><Link href="/systems/new">Criar sistema</Link></Button></div>
    {result.data.length === 0 ? <Card className="max-w-none text-center"><h2 className="text-lg font-medium">Você ainda não criou sistemas.</h2><p className="mt-2 text-sm text-muted-foreground">Crie um sistema para começar a organizar suas coleções.</p><Button asChild className="mt-5"><Link href="/systems/new">Criar sistema</Link></Button></Card> : <ul className="grid gap-4 sm:grid-cols-2">{result.data.map((system) => <li key={system.id}><Link href={`/systems/${system.id}`} className="block rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:bg-muted/70"><h2 className="font-medium">{system.name}</h2>{system.description && <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{system.description}</p>}<p className="mt-4 text-xs text-muted-foreground">Atualizado <LocalDate value={system.updatedAt} /></p></Link></li>)}</ul>}
  </div>;
}
