import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MediaManager } from "@/app/components/media/media-manager";
import { getSystem } from "@/lib/api/systems";
import { getRecordImages, getSystemCover } from "@/lib/api/media";
import { DemoSignIn } from "./demo-sign-in";

const exampleFile = { url: "/demo/imagens/exemplo", fileName: "teste.jpg" };

export default async function ImagesDemoPage() {
  const systemId = process.env.MEDIA_DEMO_SYSTEM_ID;
  const recordId = process.env.MEDIA_DEMO_RECORD_ID;
  if (process.env.NODE_ENV !== "development" || process.env.MEDIA_DEMO_ENABLED !== "true" || !systemId || !recordId) notFound();
  const system = await getSystem(systemId);
  const [cover, gallery] = system.ok ? await Promise.all([getSystemCover(systemId), getRecordImages(recordId)]) : [null, null];
  return <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
    <header className="space-y-3">
      <p className="text-sm text-muted-foreground">Generic Roleplay · demonstração local</p>
      <h1 className="text-3xl font-medium">Suas imagens no RPG</h1>
      <p className="max-w-3xl text-muted-foreground">Experimente adicionar sua teste.jpg como capa ou na galeria. As imagens enviadas ficam salvas e continuam disponíveis ao atualizar a página.</p>
    </header>
    {!system.ok ? <section className="rounded-2xl border border-border/70 bg-card p-6"><DemoSignIn /></section> : <>
      <section className="grid gap-6 rounded-2xl border border-border/70 bg-card p-6 sm:grid-cols-[160px_1fr]">
        <Image src={exampleFile.url} alt="Imagem teste.jpg disponível para a demonstração" width={1500} height={1700} unoptimized className="max-h-48 w-full rounded-xl object-contain" />
        <div className="space-y-3"><h2 className="text-xl font-medium">Seu arquivo está pronto</h2><p className="text-sm text-muted-foreground">JPEG · 148 KB · 1500 × 1700 pixels</p><ol className="list-inside list-decimal space-y-2 text-sm"><li>Clique em <strong>Usar teste.jpg</strong> na capa ou na galeria.</li><li>Confira a prévia e clique em <strong>Enviar imagem</strong>.</li><li>Depois do envio, atualize a página para conferir que a imagem ficou salva.</li></ol></div>
      </section>
      {(!cover?.ok || !gallery?.ok) && <p role="alert" className="text-sm text-destructive">Não foi possível carregar as imagens salvas. Confira se o storage local está ativo e atualize a página.</p>}
      <MediaManager destination={{ kind: "system-cover", id: systemId }} label="Capa do sistema" initialImages={cover?.ok && cover.data.image ? [cover.data.image] : []} exampleFile={exampleFile} />
      <MediaManager destination={{ kind: "record-image", id: recordId }} label="Galeria de imagens" initialImages={gallery?.ok ? gallery.data.items : []} exampleFile={exampleFile} />
      <nav className="flex flex-wrap gap-5 text-sm"><Link className="underline" href={`/systems/${systemId}`}>Abrir sistema</Link><Link className="underline" href={`/records/${recordId}`}>Abrir registro</Link></nav>
    </>}
  </main>;
}
