import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteSystemAction } from "@/app/actions/systems";
import { Breadcrumbs } from "@/app/components/content/breadcrumbs";
import { DeleteResource } from "@/app/components/content/delete-resource";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { getSystem } from "@/lib/api/systems";
import { listCollections } from "@/lib/api/collections";
import { isUuid } from "@/lib/api/contracts";
import { mapApiError } from "@/lib/api/errors";
import { LocalDate } from "@/app/components/local-date";

export default async function SystemDetailPage({ params }: { params: Promise<{ systemId: string }> }) {
  const { systemId } = await params;
  if (!isUuid(systemId)) notFound();
  const systemResult = await getSystem(systemId);
  if (!systemResult.ok) { if (systemResult.error.statusCode === 404) notFound(); return <p role="alert">{mapApiError(systemResult.error).message}</p>; }
  const collectionsResult = await listCollections(systemId);
  const system = systemResult.data;
  return <><Breadcrumbs items={[{ label: "Sistemas", href: "/systems" }, { label: system.name }]} /><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-medium">{system.name}</h1>{system.description && <p className="mt-3 max-w-3xl whitespace-pre-wrap text-muted-foreground">{system.description}</p>}<p className="mt-3 text-xs text-muted-foreground">Criado <LocalDate value={system.createdAt} /> · Atualizado <LocalDate value={system.updatedAt} /></p></div><div className="flex gap-2"><Button asChild variant="outline"><Link href={`/systems/${system.id}/edit`}>Editar</Link></Button><Button asChild><Link href={`/systems/${system.id}/collections/new`}>Criar coleção</Link></Button></div></div>
    <section className="mt-10 space-y-4"><h2 className="text-xl font-medium">Coleções</h2>{!collectionsResult.ok ? <p role="alert" className="text-muted-foreground">Não foi possível carregar as coleções deste sistema.</p> : collectionsResult.data.length === 0 ? <Card className="max-w-none"><p className="text-muted-foreground">Este sistema ainda não possui coleções.</p><Button asChild className="mt-4"><Link href={`/systems/${system.id}/collections/new`}>Criar coleção</Link></Button></Card> : <ul className="grid gap-3 sm:grid-cols-2">{collectionsResult.data.map((collection) => <li key={collection.id}><Link href={`/collections/${collection.id}`} className="block rounded-xl border border-border/70 bg-card p-4 hover:bg-muted/70"><h3 className="font-medium">{collection.name}</h3><p className="mt-1 font-mono text-xs text-muted-foreground">{collection.identifier}</p></Link></li>)}</ul>}{collectionsResult.ok && collectionsResult.data.length >= 100 && <p className="text-sm text-muted-foreground">Este sistema já atingiu o limite de 100 coleções.</p>}</section>
    <section className="mt-12 border-t border-border/70 pt-6"><DeleteResource action={deleteSystemAction.bind(null, system.id)} name={system.name} warning="Excluir este sistema também remove todas as suas coleções, templates e registros. Esta ação não pode ser desfeita." /></section>
  </>;
}
