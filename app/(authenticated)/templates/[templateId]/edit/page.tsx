import { notFound } from "next/navigation";
import { updateTemplateAction } from "@/app/actions/templates";
import { Breadcrumbs } from "@/app/components/content/breadcrumbs";
import { TemplateForm } from "@/app/components/templates/template-form";
import { getCollection } from "@/lib/api/collections";
import { getSystem } from "@/lib/api/systems";
import { getTemplate } from "@/lib/api/templates";
import { isUuid } from "@/lib/api/contracts";
import { mapApiError } from "@/lib/api/errors";

export default async function EditTemplatePage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  if (!isUuid(templateId)) notFound();
  const template = await getTemplate(templateId);
  if (!template.ok) { if (template.error.statusCode === 404) notFound(); return <p role="alert">{mapApiError(template.error).message}</p>; }
  const collection = await getCollection(template.data.collectionId);
  if (!collection.ok) { if (collection.error.statusCode === 404) notFound(); return <p role="alert">Não foi possível carregar a coleção deste template.</p>; }
  const system = await getSystem(collection.data.systemId);
  if (!system.ok) { if (system.error.statusCode === 404) notFound(); return <p role="alert">Não foi possível carregar o sistema.</p>; }
  return <><Breadcrumbs items={[{ label: "Sistemas", href: "/systems" }, { label: system.data.name, href: `/systems/${system.data.id}` }, { label: collection.data.name, href: `/collections/${collection.data.id}` }, { label: template.data.name, href: `/templates/${templateId}` }, { label: "Editar" }]} /><h1 className="mb-6 text-3xl font-medium">Editar template</h1><TemplateForm action={updateTemplateAction.bind(null, templateId)} mode="edit" initial={template.data} /></>;
}
