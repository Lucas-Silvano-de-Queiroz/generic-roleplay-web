// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useUnsavedChanges } from "@/app/components/forms/use-unsaved-changes";
import Link from "next/link";

function Draft({ dirty }: { dirty: boolean }) {
  useUnsavedChanges(dirty);
  return <Link href="/systems">Sistemas</Link>;
}
it("rascunho alterado protege navegação e reload; limpo navega sem aviso", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const view = render(<Draft dirty />);
  expect(fireEvent.click(screen.getByRole("link"))).toBe(false);
  expect(confirm).toHaveBeenCalledTimes(1);
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload); expect(unload.defaultPrevented).toBe(true);
  view.rerender(<Draft dirty={false} />);
  const cleanUnload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(cleanUnload); expect(cleanUnload.defaultPrevented).toBe(false);
});
