"use client";
import { useEffect } from "react";
export function FocusFirstError({ errors }: { errors?: Record<string, string> }) {
  const signature = JSON.stringify(errors ?? {});
  useEffect(() => {
    if (!signature || signature === "{}") return;
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [signature]);
  return null;
}
