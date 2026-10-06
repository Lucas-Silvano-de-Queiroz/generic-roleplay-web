import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteRecordAction } from "@/app/actions/records";
import { Breadcrumbs } from "@/app/components/content/breadcrumbs";
import { DeleteResource } from "@/app/components/content/delete-resource";
import { RecordValues } from "@/app/components/records/record-values";
import { Button } from "@/app/components/ui/button";
import { getCollection } from "@/lib/api/collections";
import { getRecord } from "@/lib/api/records";
import { getSystem } from "@/lib/api/systems";
import { getTemplate } from "@/lib/api/templates";
import { isUuid } from "@/lib/api/contracts";
import { mapApiError } from "@/lib/api/errors";
import { LocalDate } from "@/app/components/local-date";

export default async function RecordDetailPage({ params }: { params: Promise<{ recordId: string }> }) {
  const { recordId } = await params;
  if (!isUuid(recordId)) notFound();
  const record = await getRecord(recordId);
  if (!record.ok) { if (record.error.statusCode === 404) notFound(); return <p role="alert">{mapApiError(record.error).message}</p>; }
  const template = await getTemplate(record.data.templateId);
  if (!template.ok) { if (template.error.statusCode === 404) notFound(); return <p role="alert">Não foi possível carregar o template.</p>; }
  const collection = await getCollection(template.data.collectionId);
  if (!collection.ok) { if (collection.error.statusCode === 404) notFound(); return <p role="alert">Não foi possível carregar a coleção.</p>; }
  const system = await getSystem(collection.data.systemId);
  if (!system.ok) { if (system.error.statusCode === 404) notFound(); return <p role="alert">Não foi possível carregar o sistema.</p>; }
  const nameField = template.data.fields.find((field) => field.key === "name");
  const title = nameField && record.data.values[nameField.key]?.trim() ? record.data.values[nameField.key] : `Registro ${record.data.id}`;
  return <><Breadcrumbs items={[{ label: "Sistemas", href: "/systems" }, { label: system.data.name, href: `/systems/${system.data.id}` }, { label: collection.data.name, href: `/collections/${collection.data.id}` }, { label: template.data.name, href: `/templates/${template.data.id}` }, { label: title }]} /><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">{template.data.name}</p><h1 className="mt-1 break-words text-3xl font-medium">{title}</h1><p className="mt-3 text-xs text-muted-foreground">Criado <LocalDate value={record.data.createdAt} /> · Atualizado <LocalDate value={record.data.updatedAt} /></p></div><Button asChild variant="outline"><Link href={`/records/${recordId}/edit`}>Editar</Link></Button></div><div className="mt-8"><RecordValues fields={template.data.fields} record={record.data} /></div><section className="mt-12 border-t border-border/70 pt-6"><DeleteResource action={deleteRecordAction.bind(null, recordId)} name={title} warning="Excluir este registro? Esta ação não pode ser desfeita." /></section></>;
}
