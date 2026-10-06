import { NextResponse, type NextRequest } from "next/server";
import { listRecords } from "@/lib/api/records";
import { isUuid } from "@/lib/api/contracts";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };
export async function GET(request: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await context.params;
  if (!isUuid(templateId)) return NextResponse.json({ message: "Recurso não encontrado." }, { status: 404, headers: noStore });
  const query = request.nextUrl.searchParams;
  const keys = [...new Set(query.keys())];
  if (keys.some((key) => key !== "limit" && key !== "cursor") || query.getAll("limit").length > 1 || query.getAll("cursor").length > 1) return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400, headers: noStore });
  const limitText = query.get("limit") ?? "50";
  if (!/^[1-9]\d*$/.test(limitText) || Number(limitText) > 100) return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400, headers: noStore });
  const cursor = query.get("cursor") ?? undefined;
  if (cursor !== undefined && !isUuid(cursor)) return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400, headers: noStore });
  const result = await listRecords(templateId, { limit: Number(limitText), ...(cursor ? { cursor } : {}) });
  if (!result.ok) {
    const status = result.error.statusCode ?? (result.error.kind === "network" || result.error.kind === "timeout" ? 503 : 502);
    return NextResponse.json({ message: result.error.statusCode === 404 ? "Recurso não encontrado." : "Não foi possível carregar os registros." }, { status, headers: noStore });
  }
  return NextResponse.json(result.data, { headers: noStore });
}
