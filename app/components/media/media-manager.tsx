"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { decodeImageAccess, type ImageAccess, type MediaDestinationKind, type MediaImage, type UploadAuthorization } from "@/lib/media/contracts";

type Destination = { kind: MediaDestinationKind; id: string };
type Operation = "idle" | "checksum" | "reserve" | "upload" | "complete" | "cancelled" | "error";
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function MediaManager({ destination, label, initialImages, exampleFile }: { destination: Destination; label: string; initialImages: MediaImage[]; exampleFile?: { url: string; fileName: string } }) {
  const headingId = useId();
  const [loadingExample, setLoadingExample] = useState(false);
  const exampleAbortRef = useRef<AbortController | null>(null);
  const [images, setImages] = useState(initialImages);
  const [previousImages, setPreviousImages] = useState(initialImages);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [preview, setPreview] = useState("");
  const [operation, setOperation] = useState<Operation>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const [pendingAltId, setPendingAltId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [accessRetry, setAccessRetry] = useState(0);
  const [completionPending, setCompletionPending] = useState(false);
  const router = useRouter();
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reservationIdRef = useRef<string | null>(null);
  const completeIdRef = useRef<string | null>(null);
  const operationIdRef = useRef(0);
  const startLockRef = useRef(false);
  const activeDestination = `${destination.kind}:${destination.id}`;
  const busy = operation === "checksum" || operation === "reserve" || operation === "upload" || operation === "complete";
  const cover = destination.kind !== "record-image";
  const limitReached = cover ? false : images.length >= 10;
  const phaseRef = useRef(operation);
  if (initialImages !== previousImages) {
    setPreviousImages(initialImages);
    setImages(initialImages);
  }

  useEffect(() => { phaseRef.current = operation; }, [operation]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  useEffect(() => {
    if (retryAfterSeconds < 1) return;
    const timer = window.setTimeout(() => setRetryAfterSeconds((remaining) => Math.max(0, remaining - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [retryAfterSeconds]);

  useEffect(() => () => {
    operationIdRef.current += 1;
    exampleAbortRef.current?.abort();
    abortRef.current?.abort();
    xhrRef.current?.abort();
    if (reservationIdRef.current && phaseRef.current !== "complete") {
      const mediaId = reservationIdRef.current;
      void fetch(`/api/media/${mediaId}`, { method: "DELETE", keepalive: true, cache: "no-store" });
    }
  }, [activeDestination]);

  const selectFile = (selected: File | undefined) => {
    if (!selected) return;
    if (reservationIdRef.current) {
      const previousId = reservationIdRef.current;
      void fetch(`/api/media/${previousId}`, { method: "DELETE", cache: "no-store" }).catch(() => undefined);
    }
    setError(""); setMessage(""); setProgress(null); setRetryAfterSeconds(0); setAlt(""); setCompletionPending(false); completeIdRef.current = null; reservationIdRef.current = null;
    if (!ACCEPTED.has(selected.type)) { setFile(null); setPreview(""); setError("Escolha uma imagem JPEG, PNG ou WebP estática."); return; }
    if (selected.size < 1 || selected.size > MAX_BYTES) { setFile(null); setPreview(""); setError("O arquivo deve ter entre 1 byte e 10 MiB."); return; }
    setFile(selected); setPreview(URL.createObjectURL(selected)); setOperation("idle");
  };

  const selectExample = async () => {
    if (!exampleFile || busy || loadingExample || limitReached) return;
    const controller = new AbortController();
    exampleAbortRef.current = controller;
    setLoadingExample(true); setError("");
    try {
      const response = await fetch(exampleFile.url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Não foi possível carregar a imagem de exemplo. Entre na demonstração novamente.");
      const blob = await response.blob();
      if (!controller.signal.aborted) selectFile(new File([blob], exampleFile.fileName, { type: blob.type }));
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o exemplo.");
    } finally {
      if (!controller.signal.aborted) setLoadingExample(false);
    }
  };

  const cancel = async () => {
    operationIdRef.current += 1;
    abortRef.current?.abort(); xhrRef.current?.abort();
    setRetryAfterSeconds(0);
    const mediaId = reservationIdRef.current;
    completeIdRef.current = null; reservationIdRef.current = null; setCompletionPending(false);
    if (mediaId) await fetch(`/api/media/${mediaId}`, { method: "DELETE", cache: "no-store" }).catch(() => undefined);
    setOperation("cancelled"); setProgress(null); setMessage("Envio cancelado. O arquivo continua selecionado.");
  };

  const requestJson = async <T,>(url: string, init: RequestInit, signal?: AbortSignal): Promise<T> => {
    const response = await fetch(url, { ...init, ...(signal ? { signal } : {}), cache: "no-store", headers: { "Content-Type": "application/json" } });
    let body: unknown;
    try { body = await response.json(); } catch { throw new Error("O serviço retornou uma resposta inválida."); }
    if (!response.ok) {
      const bodyMessage = typeof body === "object" && body !== null && "message" in body && typeof (body as { message?: unknown }).message === "string" ? (body as { message: string }).message : "Não foi possível concluir a operação.";
      const failure = new Error(bodyMessage) as Error & { status?: number; retryAfter?: string | null };
      failure.status = response.status; failure.retryAfter = response.headers.get("Retry-After"); throw failure;
    }
    return body as T;
  };

  const checksumOf = async (selected: File): Promise<string> => {
    const digest = await crypto.subtle.digest("SHA-256", await selected.arrayBuffer());
    let binary = "";
    for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
    return btoa(binary);
  };

  const reserve = async (selected: File, checksumSha256: string, signal: AbortSignal): Promise<UploadAuthorization> => {
    setOperation("reserve");
    const body = {
      destination: destination.kind === "record-image"
        ? { kind: destination.kind, id: destination.id }
        : { kind: destination.kind, id: destination.id, expectedCoverMediaId: images[0]?.id ?? null },
      fileName: selected.name,
      contentType: selected.type,
      sizeBytes: selected.size,
      checksumSha256,
      alt,
    };
    const authorization = await requestJson<UploadAuthorization>("/api/media/uploads", { method: "POST", body: JSON.stringify(body) }, signal);
    reservationIdRef.current = authorization.id;
    return authorization;
  };

  const putFile = (selected: File, authorization: UploadAuthorization, operationId: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhrRef.current = xhr;
    xhr.open("PUT", authorization.upload.url, true);
    xhr.withCredentials = false;
    for (const [name, value] of Object.entries(authorization.upload.headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (operationId !== operationIdRef.current) return;
      setProgress(event.lengthComputable && event.total > 0 ? Math.min(100, Math.round((event.loaded / event.total) * 100)) : null);
    };
    xhr.onerror = () => reject(new Error("Falha de rede ao enviar a imagem."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        const failure = new Error(xhr.status === 403 ? "A autorização de envio expirou." : "O storage recusou o envio da imagem.") as Error & { status?: number };
        failure.status = xhr.status; reject(failure);
      }
    };
    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    setOperation("upload"); setProgress(0); xhr.send(selected);
  });

  const confirm = async (mediaId: string, signal: AbortSignal) => {
    setOperation("complete"); setMessage("Processando imagem…");
    const image = await requestJson<MediaImage>(`/api/media/${mediaId}/complete`, { method: "POST", body: "{}" }, signal);
    if (image.destination.kind !== destination.kind || image.destination.id !== destination.id) throw new Error("A imagem foi confirmada para outro recurso.");
    setImages((current) => destination.kind === "record-image" ? [...current.filter((item) => item.id !== image.id), image].slice(0, 10) : [image]);
    setFile(null); setPreview(""); setAlt(""); setOperation("idle"); setMessage("Imagem adicionada."); setError(""); setProgress(null); setCompletionPending(false);
    reservationIdRef.current = null; completeIdRef.current = null;
    router.refresh();
  };

  const start = async () => {
    if (busy || loadingExample || startLockRef.current || (!file && !completeIdRef.current) || limitReached) return;
    startLockRef.current = true;
    setError(""); setMessage("");
    const operationId = ++operationIdRef.current;
    const controller = new AbortController(); abortRef.current = controller;
    try {
      if (reservationIdRef.current && !completeIdRef.current) {
        const previousId = reservationIdRef.current;
        setOperation("reserve"); setMessage("Liberando uma reserva anterior…");
        await fetch(`/api/media/${previousId}`, { method: "DELETE", cache: "no-store", signal: controller.signal }).catch(() => undefined);
        if (operationId !== operationIdRef.current) return;
        reservationIdRef.current = null;
      }
      if (completeIdRef.current) {
        await confirm(completeIdRef.current, controller.signal);
        return;
      }
      const selected = file;
      if (!selected) return;
      setOperation("checksum"); setMessage("Calculando checksum seguro…");
      const checksumSha256 = await checksumOf(selected);
      if (operationId !== operationIdRef.current) return;
      let authorization = await reserve(selected, checksumSha256, controller.signal);
      try {
        await putFile(selected, authorization, operationId, controller.signal);
      } catch (cause) {
        const status = (cause as { status?: number }).status;
        if (status !== 403) throw cause;
        await fetch(`/api/media/${authorization.id}`, { method: "DELETE", cache: "no-store" }).catch(() => undefined);
        reservationIdRef.current = null;
        authorization = await reserve(selected, checksumSha256, controller.signal);
        await putFile(selected, authorization, operationId, controller.signal);
      }
      if (operationId !== operationIdRef.current) return;
      completeIdRef.current = authorization.id;
      setCompletionPending(true);
      await confirm(authorization.id, controller.signal);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (operationId !== operationIdRef.current) return;
      const status = (cause as { status?: number }).status;
      const retryAfter = Number((cause as { retryAfter?: string | null }).retryAfter);
      const failureMessage = cause instanceof Error ? cause.message : "Não foi possível enviar a imagem.";
      setError(failureMessage); setOperation("error"); setMessage("");
      if (Number.isInteger(retryAfter) && retryAfter > 0) setRetryAfterSeconds(Math.min(300, retryAfter));
      if ((status === 409 && !(retryAfter > 0)) || [410, 413, 415, 422].includes(status ?? 0)) {
        const mediaId = reservationIdRef.current;
        if (mediaId) void fetch(`/api/media/${mediaId}`, { method: "DELETE", cache: "no-store" }).catch(() => undefined);
        reservationIdRef.current = null; completeIdRef.current = null; setCompletionPending(false);
      }
      if (status === 409) router.refresh();
    } finally {
      startLockRef.current = false;
    }
  };

  const removeImage = async (image: MediaImage) => {
    const warning = destination.kind === "system-cover" || destination.kind === "collection-cover"
      ? "Remover esta capa? Ela deixará de aparecer neste recurso."
      : "Remover esta imagem da galeria?";
    if (!window.confirm(warning)) return;
    if (pendingDeleteId) return;
    setPendingDeleteId(image.id);
    try {
      const response = await fetch(`/api/media/${image.id}`, { method: "DELETE", cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível remover a imagem.");
      setImages((current) => current.filter((item) => item.id !== image.id)); setMessage("Imagem removida."); setError("");
      router.refresh();
    } catch { setError("Não foi possível remover a imagem. Tente novamente."); }
    finally { setPendingDeleteId(null); }
  };

  const saveAlt = async (image: MediaImage, nextAlt: string) => {
    if (pendingAltId) return;
    setPendingAltId(image.id);
    try {
      const updated = await requestJson<MediaImage>(`/api/media/${image.id}`, { method: "PATCH", body: JSON.stringify({ alt: nextAlt }) });
      setImages((current) => current.map((item) => item.id === updated.id ? updated : item)); setMessage("Texto alternativo atualizado."); setError("");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o texto alternativo."); }
    finally { setPendingAltId(null); }
  };

  return <section className="mt-10 space-y-4 border-t border-border/70 pt-6" aria-labelledby={headingId}>
    <div><h2 id={headingId} className="text-xl font-medium">{label}</h2><p className="mt-1 text-sm text-muted-foreground">JPEG, PNG ou WebP estático · até 10 MiB{cover ? " · uma imagem" : " · até 10 imagens"}</p></div>
    {images.length > 0 && <ul className={cover ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
      {images.map((image) => <li key={image.id} className="rounded-xl border border-border/70 bg-card p-4">
        <PrivateImage key={`${image.id}:${accessRetry}`} image={image} onRetry={() => setAccessRetry((value) => value + 1)} />
        <label className="mt-3 block space-y-1 text-sm"><span>Texto alternativo</span><input aria-label={`Texto alternativo para ${image.fileName}`} maxLength={500} disabled={Boolean(pendingAltId)} value={image.alt} onChange={(event) => setImages((current) => current.map((item) => item.id === image.id ? { ...item, alt: event.target.value } : item))} className="h-10 w-full rounded-lg border border-border bg-background px-3 disabled:opacity-60" /></label>
        <div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={Boolean(pendingAltId)} loading={pendingAltId === image.id} onClick={() => void saveAlt(image, images.find((item) => item.id === image.id)?.alt ?? image.alt)}>Salvar texto alternativo</Button><Button type="button" size="sm" variant="ghost" disabled={Boolean(pendingDeleteId)} loading={pendingDeleteId === image.id} onClick={() => void removeImage(image)}>{cover ? "Remover capa" : "Remover imagem"}</Button></div>
      </li>)}
    </ul>}
    {preview && file && <div className="max-w-md rounded-xl border border-border/70 p-4"><p className="mb-2 text-sm font-medium">Prévia local: {file.name}</p><Image src={preview} alt="Prévia da imagem selecionada" width={480} height={320} unoptimized className="max-h-72 w-full rounded-lg object-contain" /><label className="mt-3 block space-y-1 text-sm"><span>Texto alternativo</span><input value={alt} maxLength={500} onChange={(event) => setAlt(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3" /></label></div>}
    {!cover && images.length < 10 && <p className="text-xs text-muted-foreground">{images.length} de 10 imagens adicionadas.</p>}
    <div className="flex flex-wrap items-center gap-3">
      {exampleFile && <Button type="button" variant="outline" loading={loadingExample} disabled={busy || limitReached} onClick={() => void selectExample()}>Usar {exampleFile.fileName}</Button>}
      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-border/70 px-5 text-sm hover:bg-muted/70 has-[:disabled]:pointer-events-none has-[:disabled]:opacity-60">{cover && images.length ? "Selecionar nova capa" : "Selecionar imagem"}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label={cover ? "Selecionar capa" : "Selecionar imagem para a galeria"} disabled={busy || loadingExample || limitReached} onChange={(event) => selectFile(event.currentTarget.files?.[0])} className="sr-only" /></label>
      {file && <><Button type="button" onClick={() => void start()} loading={busy} disabled={busy || loadingExample || limitReached || retryAfterSeconds > 0}>{retryAfterSeconds > 0 ? `Tentar novamente em ${retryAfterSeconds}s` : completionPending ? "Tentar confirmar" : cover && images.length ? "Enviar e substituir capa" : "Enviar imagem"}</Button>{busy && <Button type="button" variant="outline" onClick={() => void cancel()}>Cancelar envio</Button>}</>}
      {file && !busy && <Button type="button" variant="ghost" onClick={() => { setFile(null); setPreview(""); setError(""); setMessage("Seleção cancelada."); setOperation("idle"); }}>Limpar seleção</Button>}
    </div>
    {busy && <p className="text-sm text-muted-foreground" aria-live="polite">{operation === "checksum" ? "Calculando checksum…" : operation === "reserve" ? "Reservando espaço…" : operation === "upload" ? progress === null ? "Enviando imagem…" : `Enviando imagem: ${progress}%` : "Processando imagem…"}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{message}</p>}
  </section>;
}

function PrivateImage({ image, onRetry }: { image: MediaImage; onRetry: () => void }) {
  const [access, setAccess] = useState<ImageAccess | null>(null);
  const [error, setError] = useState(false);
  const [refreshAttempted, setRefreshAttempted] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/media/${image.id}/access`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Imagem indisponível");
        const body = decodeImageAccess(await response.json());
        if (body.id !== image.id) throw new Error("Imagem inválida");
        return body;
      })
      .then((body) => { if (!controller.signal.aborted) { setAccess(body); setError(false); } })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [image.id, reload]);
  if (error || !access) return <div className="flex min-h-36 items-center justify-center rounded-lg bg-muted/40 p-4 text-center text-sm text-muted-foreground">{error ? <span>Imagem indisponível. <button type="button" className="underline" onClick={onRetry}>Tentar novamente</button></span> : "Carregando imagem privada…"}</div>;
  return <Image src={access.url} alt={image.alt} width={image.width} height={image.height} unoptimized onError={() => { if (!refreshAttempted) { setRefreshAttempted(true); setAccess(null); setReload((value) => value + 1); } else setError(true); }} className="max-h-80 w-full rounded-lg object-contain" />;
}
