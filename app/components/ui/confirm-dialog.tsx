"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/app/components/ui/button";

type ConfirmDialogProps = { title: string; description: string; confirmLabel?: string; children: ReactNode; pending?: boolean };
export function ConfirmDialog({ title, description, confirmLabel = "Excluir", children, pending = false }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) dialogRef.current?.querySelector<HTMLElement>("button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex='-1'])")?.focus();
    else if (wasOpen.current) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  function keepFocusInsideDialog(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && !pending) {
      setOpen(false);
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

  return <>
    <Button ref={triggerRef} type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>{confirmLabel}</Button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setOpen(false); }}>
      <section ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl" onKeyDown={keepFocusInsideDialog}>
        <h2 id="confirm-title" className="text-lg font-semibold">{title}</h2>
        <p id="confirm-description" className="mt-2 text-sm text-muted-foreground">{description}</p>
        {children}
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit" form="confirmation-form" variant="primary" disabled={pending}>{pending ? "Aguarde…" : confirmLabel}</Button>
        </div>
      </section>
    </div>}
  </>;
}
