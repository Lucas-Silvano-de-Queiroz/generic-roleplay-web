"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RecordPage, RpgRecord } from "@/lib/api/contracts";
import { Button } from "@/app/components/ui/button";
import { LocalDate } from "@/app/components/local-date";

export function RecordList({ templateId, initialPage, initialError, nameKey }: { templateId: string; initialPage?: RecordPage; initialError?: string; nameKey?: string }) {
  const [items, setItems] = useState(initialPage?.items ?? []);
  const [nextCursor, setNextCursor] = useState(initialPage?.nextCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const activeTemplateId = useRef(templateId);
  const requestController = useRef<AbortController | null>(null);
  useLayoutEffect(() => { activeTemplateId.current = templateId; }, [templateId]);
  useEffect(() => () => requestController.current?.abort(), [templateId]);
  async function loadMore() {
    if ((!nextCursor && !error) || pending) return;
    setPending(true); setError(null);
    const requestedTemplate = templateId;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    try {
      const cursorParam = nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : "";
      const response = await fetch(`/api/templates/${requestedTemplate}/records?limit=50${cursorParam}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Não foi possível carregar a próxima página.");
      const page = await response.json() as RecordPage;
      if (requestedTemplate !== activeTemplateId.current) return;
      setItems((previous) => { const knownIds = new Set(previous.map((record) => record.id)); return [...previous, ...page.items.filter((record) => !knownIds.has(record.id))]; });
      setNextCursor(page.nextCursor);
    } catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os registros."); }
    finally { if (requestedTemplate === activeTemplateId.current) setPending(false); }
  }
  return <section className="space-y-4" aria-labelledby="records-heading"><div className="flex flex-wrap items-baseline justify-between gap-3"><h2 id="records-heading" className="text-xl font-medium">Registros</h2><p className="text-xs text-muted-foreground">{items.length} registros carregados</p></div>
    {items.length === 0 && !error ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Ainda não há registros para este template.</p> : items.length > 0 ? <ul className="divide-y divide-border/70 rounded-xl border border-border/70">{items.map((record) => <li key={record.id}><RecordLink record={record} nameKey={nameKey} /></li>)}</ul> : null}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{(nextCursor || error) && <Button type="button" variant="outline" loading={pending} disabled={pending} onClick={loadMore}>{items.length ? "Carregar mais" : "Tentar novamente"}</Button>}
  </section>;
}
function RecordLink({ record, nameKey }: { record: RpgRecord; nameKey?: string }) {
  const name = nameKey && Object.hasOwn(record.values, nameKey) && record.values[nameKey].trim() ? record.values[nameKey] : `Registro ${record.id}`;
  return <Link href={`/records/${record.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-muted/50"><span className="max-w-full truncate font-medium">{name}</span><span className="text-xs text-muted-foreground"><LocalDate value={record.updatedAt} /></span></Link>;
}
