"use client";

import { useCallback, useEffect } from "react";

const UNSAVED_CHANGES_MESSAGE = "Há alterações não salvas. Deseja sair desta página?";

export function useUnsavedChanges(dirty: boolean): { confirmNavigation: (href: string) => boolean } {
  const confirmNavigation = useCallback((href: string) => {
    if (!dirty || href === window.location.href) return true;
    return window.confirm(UNSAVED_CHANGES_MESSAGE);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;

    function preventLeavingWithUnsavedChanges(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function confirmInternalNavigation(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
      if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", preventLeavingWithUnsavedChanges);
    document.addEventListener("click", confirmInternalNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", preventLeavingWithUnsavedChanges);
      document.removeEventListener("click", confirmInternalNavigation, true);
    };
  }, [dirty]);

  return { confirmNavigation };
}
