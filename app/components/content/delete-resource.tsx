"use client";
import { useActionState, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/app/components/ui/button";
import type { FormState } from "@/lib/forms/state";
type DeleteResourceProps = { action: (previous: FormState, formData: FormData) => Promise<FormState>; name: string; warning: string };
const initialState: FormState = {};
export function DeleteResource({ action, name, warning }: DeleteResourceProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (confirming) {
      dialogRef.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
    } else if (wasConfirming.current) {
      triggerRef.current?.focus();
    }
    wasConfirming.current = confirming;
  }, [confirming]);

  function keepFocusInsideDialog(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !pending) {
      setConfirming(false);
      return;
    }
    if (event.key !== "Tab") return;
    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex='-1'])");
    if (!focusableElements?.length) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  if (!confirming) return <Button ref={triggerRef} type="button" variant="outline" onClick={() => setConfirming(true)}>Excluir</Button>;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setConfirming(false); }}><div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" className="w-full max-w-lg rounded-2xl border border-destructive/30 bg-card p-5 shadow-2xl" onKeyDown={keepFocusInsideDialog}>
    <h3 id="delete-title" className="font-medium">Excluir {name}?</h3><p id="delete-description" className="mt-2 text-sm text-muted-foreground">{warning}</p>
    {state.message && <p role="alert" className="mt-3 text-sm text-destructive">{state.message}</p>}
    <div className="mt-4 flex gap-3"><form action={formAction}><Button type="submit" variant="primary" disabled={pending} loading={pending}>Confirmar exclusão</Button></form><Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>Cancelar</Button></div>
  </div></div>;
}
