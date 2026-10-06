import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteTemplateAction } from "@/app/actions/templates";
import { Breadcrumbs } from "@/app/components/content/breadcrumbs";
import { DeleteResource } from "@/app/components/content/delete-resource";
import { RecordList } from "@/app/components/records/record-list";
import { Button } from "@/app/components/ui/button";
import { getCollection } from "@/lib/api/collections";
import { listRecords } from "@/lib/api/records";
import { getSystem } from "@/lib/api/systems";
import { getTemplate } from "@/lib/api/templates";
import { isUuid } from "@/lib/api/contracts";
import { mapApiError } from "@/lib/api/errors";
import { LocalDate } from "@/app/components/local-date";

export default async function TemplateDetailPage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  if (!isUuid(templateId)) notFound();
  const template = await getTemplate(templateId);
  if (!template.ok) { if (template.error.statusCode === 404) notFound(); return <p role="alert">{mapApiError(template.error).message}</p>; }
  const collection = await getCollection(template.data.collectionId);
  if (!collection.ok) { if (collection.error.statusCode === 404) notFound(); return <p role="alert">Não foi possível carregar a coleção.</p>; }
  const [system, firstPage] = await Promise.all([getSystem(collection.data.systemId), listRecords(templateId, { limit: 50 })]);
  if (!system.ok) { if (system.error.statusCode === 404) notFound(); return <p role="alert">Não foi possível carregar o sistema.</p>; }
  const recordsError = firstPage.ok ? undefined : mapApiError(firstPage.error).message;
  const templateData = template.data;
  const nameField = templateData.fields.find((field) => field.key === "name");
  return <><Breadcrumbs items={[{ label: "Sistemas", href: "/systems" }, { label: system.data.name, href: `/systems/${system.data.id}` }, { label: collection.data.name, href: `/collections/${collection.data.id}` }, { label: templateData.name }]} /><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs text-muted-foreground">{templateData.identifier}{templateData.category ? ` · ${templateData.category}` : ""}</p><h1 className="mt-1 text-3xl font-medium">{templateData.name}</h1>{templateData.description && <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{templateData.description}</p>}<p className="mt-3 text-xs text-muted-foreground">Criado <LocalDate value={templateData.createdAt} /> · Atualizado <LocalDate value={templateData.updatedAt} /></p></div><div className="flex gap-2"><Button asChild variant="outline"><Link href={`/templates/${templateId}/edit`}>Editar</Link></Button><Button asChild><Link href={`/templates/${templateId}/records/new`}>Criar registro</Link></Button></div></div>
    <section className="mt-8 space-y-3"><h2 className="text-xl font-medium">Definição dos campos</h2>{templateData.fields.length === 0 ? <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Este template ainda não possui campos.</p> : <ol className="grid gap-3 sm:grid-cols-2">{templateData.fields.map((field, index) => <li key={field.key} className="rounded-xl border border-border/70 bg-card p-4"><p className="text-xs text-muted-foreground">{index + 1} · <code>{field.key}</code> {field.required && "· obrigatório"}</p><h3 className="mt-1 font-medium">{field.label}</h3>{field.description && <p className="mt-2 text-sm text-muted-foreground">{field.description}</p>}</li>)}</ol>}</section>
    <div className="mt-10"><RecordList key={templateId} templateId={templateId} initialPage={firstPage.ok ? firstPage.data : undefined} initialError={recordsError} nameKey={nameField?.key} /></div>
    <section className="mt-12 border-t border-border/70 pt-6"><DeleteResource action={deleteTemplateAction.bind(null, templateId)} name={templateData.name} warning="Excluir este template também remove todos os seus registros. Esta ação não pode ser desfeita." /></section>
  </>;
}
