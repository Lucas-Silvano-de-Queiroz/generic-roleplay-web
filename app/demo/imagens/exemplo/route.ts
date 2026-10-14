import { open } from "node:fs/promises";
import { getSystem } from "@/lib/api/systems";

export const runtime = "nodejs";

export async function GET() {
  const systemId = process.env.MEDIA_DEMO_SYSTEM_ID;
  const imagePath = process.env.MEDIA_DEMO_IMAGE_PATH;
  if (process.env.NODE_ENV !== "development" || process.env.MEDIA_DEMO_ENABLED !== "true" || !systemId || !imagePath) return new Response(null, { status: 404 });
  const system = await getSystem(systemId);
  if (!system.ok) return new Response(null, { status: system.error.statusCode === 401 ? 401 : 404 });
  let file;
  try {
    // O caminho vem apenas da configuração local; a URL não aceita nomes de arquivos.
    file = await open(imagePath, "r");
    const info = await file.stat();
    if (!info.isFile() || info.size < 1 || info.size > 10 * 1024 * 1024) return new Response(null, { status: 413 });
    const bytes = await file.readFile();
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/jpeg", "Content-Disposition": 'inline; filename="teste.jpg"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response(null, { status: 404 });
  } finally {
    await file?.close();
  }
}
