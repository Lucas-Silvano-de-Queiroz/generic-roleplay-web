import { notFound } from "next/navigation";
import { createTemplateAction } from "@/app/actions/templates";
import { Breadcrumbs } from "@/app/components/content/breadcrumbs";
import { TemplateForm } from "@/app/components/templates/template-form";
import { getCollection } from "@/lib/api/collections";
import { getSystem } from "@/lib/api/systems";
import { isUuid } from "@/lib/api/contracts";
import { mapApiError } from "@/lib/api/errors";

export default async function NewTemplatePage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  if (!isUuid(collectionId)) notFound();
  const collection = await getCollection(collectionId);
  if (!collection.ok) { if (collection.error.statusCode === 404) notFound(); return <p role="alert">{mapApiError(collection.error).message}</p>; }
  const system = await getSystem(collection.data.systemId);
  if (!system.ok) { if (system.error.statusCode === 404) notFound(); return <p role="alert">Não foi possível carregar o sistema.</p>; }
  return <><Breadcrumbs items={[{ label: "Sistemas", href: "/systems" }, { label: system.data.name, href: `/systems/${system.data.id}` }, { label: collection.data.name, href: `/collections/${collectionId}` }, { label: "Novo template" }]} /><h1 className="mb-6 text-3xl font-medium">Criar template</h1><TemplateForm action={createTemplateAction.bind(null, collectionId)} mode="create" /></>;
}
