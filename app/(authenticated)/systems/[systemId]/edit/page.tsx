import { notFound } from "next/navigation";
import { updateSystemAction } from "@/app/actions/systems";
import { Breadcrumbs } from "@/app/components/content/breadcrumbs";
import { EntityForm } from "@/app/components/content/entity-form";
import { getSystem } from "@/lib/api/systems";
import { isUuid } from "@/lib/api/contracts";
import { mapApiError } from "@/lib/api/errors";

export default async function EditSystemPage({ params }: { params: Promise<{ systemId: string }> }) {
  const { systemId } = await params;
  if (!isUuid(systemId)) notFound();
  const result = await getSystem(systemId);
  if (!result.ok) { if (result.error.statusCode === 404) notFound(); return <p role="alert">{mapApiError(result.error).message}</p>; }
  return <><Breadcrumbs items={[{ label: "Sistemas", href: "/systems" }, { label: result.data.name, href: `/systems/${systemId}` }, { label: "Editar" }]} /><h1 className="mb-6 text-3xl font-medium">Editar sistema</h1><EntityForm action={updateSystemAction.bind(null, systemId)} initial={result.data} mode="edit" kind="system" /></>;
}
