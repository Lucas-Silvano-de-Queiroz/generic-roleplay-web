import { notFound } from "next/navigation";
import { createRecordAction } from "@/app/actions/records";
import { Breadcrumbs } from "@/app/components/content/breadcrumbs";
import { RecordForm } from "@/app/components/records/record-form";
import { getTemplate } from "@/lib/api/templates";
import { isUuid } from "@/lib/api/contracts";
import { mapApiError } from "@/lib/api/errors";
import { getCollection } from "@/lib/api/collections";
import { getSystem } from "@/lib/api/systems";

export default async function NewRecordPage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  if (!isUuid(templateId)) notFound();
  const template = await getTemplate(templateId);
  if (!template.ok) { if (template.error.statusCode === 404) notFound(); return <p role="alert">{mapApiError(template.error).message}</p>; }
  const collection = await getCollection(template.data.collectionId);
  if (!collection.ok) { if (collection.error.statusCode === 404) notFound(); return <p role="alert">Não foi possível carregar a coleção.</p>; }
  const system = await getSystem(collection.data.systemId);
  if (!system.ok) { if (system.error.statusCode === 404) notFound(); return <p role="alert">Não foi possível carregar o sistema.</p>; }
  return <><Breadcrumbs items={[{ label: "Sistemas", href: "/systems" }, { label: system.data.name, href: `/systems/${system.data.id}` }, { label: collection.data.name, href: `/collections/${collection.data.id}` }, { label: template.data.name, href: `/templates/${templateId}` }, { label: "Novo registro" }]} /><h1 className="mb-2 text-3xl font-medium">Criar registro</h1><p className="mb-6 text-muted-foreground">{template.data.name}</p><RecordForm fields={template.data.fields} action={createRecordAction.bind(null, templateId)} /></>;
}
