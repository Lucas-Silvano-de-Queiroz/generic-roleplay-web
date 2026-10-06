import { notFound } from "next/navigation";
import { updateCollectionAction } from "@/app/actions/collections";
import { Breadcrumbs } from "@/app/components/content/breadcrumbs";
import { EntityForm } from "@/app/components/content/entity-form";
import { getCollection } from "@/lib/api/collections";
import { getSystem } from "@/lib/api/systems";
import { isUuid } from "@/lib/api/contracts";
import { mapApiError } from "@/lib/api/errors";

export default async function EditCollectionPage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  if (!isUuid(collectionId)) notFound();
  const result = await getCollection(collectionId);
  if (!result.ok) { if (result.error.statusCode === 404) notFound(); return <p role="alert">{mapApiError(result.error).message}</p>; }
  const parent = await getSystem(result.data.systemId);
  if (!parent.ok) { if (parent.error.statusCode === 404) notFound(); return <p role="alert">Não foi possível carregar o sistema desta coleção.</p>; }
  return <><Breadcrumbs items={[{ label: "Sistemas", href: "/systems" }, { label: parent.data.name, href: `/systems/${parent.data.id}` }, { label: result.data.name, href: `/collections/${collectionId}` }, { label: "Editar" }]} /><h1 className="mb-6 text-3xl font-medium">Editar coleção</h1><EntityForm action={updateCollectionAction.bind(null, collectionId)} initial={result.data} mode="edit" kind="collection" /></>;
}
