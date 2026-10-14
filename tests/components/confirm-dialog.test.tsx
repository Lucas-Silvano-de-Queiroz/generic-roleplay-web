// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { DeleteResource } from "@/app/components/content/delete-resource";

it("Escape cancela sem mutação, devolve foco e Tab permanece no diálogo", async () => {
  const user = userEvent.setup(); const action = vi.fn(async () => ({}));
  render(<DeleteResource action={action} name="Sistema" warning="Remove seus descendentes." />);
  await user.click(screen.getByRole("button", { name: "Excluir" }));
  expect(screen.getByRole("alertdialog", { name: "Excluir Sistema?" })).toBeInTheDocument();
  await user.keyboard("{Shift>}{Tab}{/Shift}");
  expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Excluir" })).toHaveFocus();
  expect(action).not.toHaveBeenCalled();
});
