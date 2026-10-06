import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCollectionAction } from "@/app/actions/collections";
import { Breadcrumbs } from "@/app/components/content/breadcrumbs";
import { DeleteResource } from "@/app/components/content/delete-resource";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { getCollection } from "@/lib/api/collections";
import { getSystem } from "@/lib/api/systems";
import { listTemplates } from "@/lib/api/templates";
import { isUuid } from "@/lib/api/contracts";
import { mapApiError } from "@/lib/api/errors";
import { LocalDate } from "@/app/components/local-date";

export default async function CollectionDetailPage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  if (!isUuid(collectionId)) notFound();
  const collectionResult = await getCollection(collectionId);
  if (!collectionResult.ok) { if (collectionResult.error.statusCode === 404) notFound(); return <p role="alert">{mapApiError(collectionResult.error).message}</p>; }
  const collection = collectionResult.data;
  const [systemResult, templatesResult] = await Promise.all([getSystem(collection.systemId), listTemplates(collection.id)]);
  if (!systemResult.ok) { if (systemResult.error.statusCode === 404) notFound(); return <p role="alert">Não foi possível carregar o sistema desta coleção.</p>; }
  return <><Breadcrumbs items={[{ label: "Sistemas", href: "/systems" }, { label: systemResult.data.name, href: `/systems/${collection.systemId}` }, { label: collection.name }]} /><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs text-muted-foreground">{collection.identifier}</p><h1 className="mt-1 text-3xl font-medium">{collection.name}</h1>{collection.description && <p className="mt-3 max-w-3xl whitespace-pre-wrap text-muted-foreground">{collection.description}</p>}<p className="mt-3 text-xs text-muted-foreground">Criado <LocalDate value={collection.createdAt} /> · Atualizado <LocalDate value={collection.updatedAt} /></p></div><div className="flex gap-2"><Button asChild variant="outline"><Link href={`/collections/${collection.id}/edit`}>Editar</Link></Button><Button asChild><Link href={`/collections/${collection.id}/templates/new`}>Criar template</Link></Button></div></div>
    <section className="mt-10 space-y-4"><h2 className="text-xl font-medium">Templates</h2>{!templatesResult.ok ? <p role="alert" className="text-muted-foreground">Não foi possível carregar os templates desta coleção.</p> : templatesResult.data.length === 0 ? <Card className="max-w-none"><p className="text-muted-foreground">Esta coleção ainda não possui templates.</p><Button asChild className="mt-4"><Link href={`/collections/${collection.id}/templates/new`}>Criar template</Link></Button></Card> : <ul className="grid gap-3 sm:grid-cols-2">{templatesResult.data.map((template) => <li key={template.id}><Link href={`/templates/${template.id}`} className="block rounded-xl border border-border/70 bg-card p-4 hover:bg-muted/70"><h3 className="font-medium">{template.name}</h3><p className="mt-1 font-mono text-xs text-muted-foreground">{template.identifier}</p>{template.category && <p className="mt-2 text-sm text-muted-foreground">{template.category}</p>}</Link></li>)}</ul>}{templatesResult.ok && templatesResult.data.length >= 100 && <p className="text-sm text-muted-foreground">Esta coleção já atingiu o limite de 100 templates.</p>}</section>
    <section className="mt-12 border-t border-border/70 pt-6"><DeleteResource action={deleteCollectionAction.bind(null, collection.id)} name={collection.name} warning="Excluir esta coleção também remove todos os seus templates e registros. Esta ação não pode ser desfeita." /></section>
  </>;
}
