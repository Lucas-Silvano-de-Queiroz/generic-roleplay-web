// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { TemplateForm } from "@/app/components/templates/template-form";
import { fields } from "../support/fixtures";

it("reordenar por botão preserva definições e omite IDs de UI", async () => {
  const user = userEvent.setup();
  const { container } = render(<TemplateForm action={async () => ({})} mode="edit" initial={{ name: "Ficha", identifier: "sheet", fields }} />);
  const move = within(screen.getAllByRole("group")[1]).getByRole("button", { name: "Mover para cima" });
  move.focus();
  await user.keyboard("{Enter}");
  const sent = JSON.parse((container.querySelector('[name="fields"]') as HTMLInputElement).value);
  expect(sent).toEqual([{ key: "notes", label: "Notas", required: false, format: "textarea" }, { key: "name", label: "Nome", required: true, format: "text" }]);
});
it("editar uma linha preserva todas as demais", async () => {
  const user = userEvent.setup();
  const { container } = render(<TemplateForm action={async () => ({})} mode="edit" initial={{ name: "Ficha", identifier: "sheet", fields }} />);
  await user.clear(within(screen.getAllByRole("group")[0]).getByLabelText("Rótulo"));
  await user.type(within(screen.getAllByRole("group")[0]).getByLabelText("Rótulo"), "Novo");
  const sent = JSON.parse((container.querySelector('[name="fields"]') as HTMLInputElement).value);
  expect(sent).toEqual([{ key: "name", label: "Novo", required: true, format: "text" }, { key: "notes", label: "Notas", required: false, format: "textarea" }]);
});
it("PATCH apenas de metadados não envia fields", () => {
  const { container } = render(<TemplateForm action={async () => ({})} mode="edit" initial={{ name: "Ficha", identifier: "sheet", fields }} />);
  expect(container.querySelector('[name="fields"]')).toBeNull();
});
