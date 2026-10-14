import { notFound } from "next/navigation";
import { updateRecordAction } from "@/app/actions/records";
import { Breadcrumbs } from "@/app/components/content/breadcrumbs";
import { RecordForm } from "@/app/components/records/record-form";
import { getRecord } from "@/lib/api/records";
import { getTemplate } from "@/lib/api/templates";
import { isUuid } from "@/lib/api/contracts";
import { mapApiError } from "@/lib/api/errors";
import { getRecordImages } from "@/lib/api/media";
import { MediaManager } from "@/app/components/media/media-manager";

export default async function EditRecordPage({ params }: { params: Promise<{ recordId: string }> }) {
  const { recordId } = await params;
  if (!isUuid(recordId)) notFound();
  const record = await getRecord(recordId);
  if (!record.ok) { if (record.error.statusCode === 404) notFound(); return <p role="alert">{mapApiError(record.error).message}</p>; }
  const template = await getTemplate(record.data.templateId);
  if (!template.ok) { if (template.error.statusCode === 404) notFound(); return <p role="alert">Não foi possível carregar o template.</p>; }
  const gallery = await getRecordImages(recordId);
  return <><Breadcrumbs items={[{ label: "Templates", href: `/templates/${template.data.id}` }, { label: `Registro ${recordId}`, href: `/records/${recordId}` }, { label: "Editar" }]} /><h1 className="mb-6 text-3xl font-medium">Editar registro</h1><RecordForm fields={template.data.fields} action={updateRecordAction.bind(null, recordId)} record={record.data} /><MediaManager destination={{ kind: "record-image", id: recordId }} label="Galeria de imagens" initialImages={gallery.ok ? gallery.data.items : []} />{!gallery.ok && <p role="status" className="mt-2 text-sm text-muted-foreground">Não foi possível carregar a galeria.</p>}</>;
}
