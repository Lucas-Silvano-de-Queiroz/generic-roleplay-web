import { notFound } from "next/navigation";
import { createCollectionAction } from "@/app/actions/collections";
import { Breadcrumbs } from "@/app/components/content/breadcrumbs";
import { EntityForm } from "@/app/components/content/entity-form";
import { getSystem } from "@/lib/api/systems";
import { isUuid } from "@/lib/api/contracts";
import { mapApiError } from "@/lib/api/errors";

export default async function NewCollectionPage({ params }: { params: Promise<{ systemId: string }> }) {
  const { systemId } = await params;
  if (!isUuid(systemId)) notFound();
  const system = await getSystem(systemId);
  if (!system.ok) { if (system.error.statusCode === 404) notFound(); return <p role="alert">{mapApiError(system.error).message}</p>; }
  return <><Breadcrumbs items={[{ label: "Sistemas", href: "/systems" }, { label: system.data.name, href: `/systems/${systemId}` }, { label: "Nova coleção" }]} /><h1 className="mb-6 text-3xl font-medium">Criar coleção</h1><EntityForm action={createCollectionAction.bind(null, systemId)} mode="create" kind="collection" /></>;
}
