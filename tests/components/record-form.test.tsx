// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { RecordForm } from "@/app/components/records/record-form";
import { record, fields } from "../support/fixtures";
import type { RecordFormState } from "@/app/actions/records";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
it("editar um valor envia os demais literalmente no rascunho completo", async () => {
  const user = userEvent.setup();
  let sent: FormData | undefined;
  render(<RecordForm fields={fields} record={record} action={async (_previous, data) => { sent = data; return {}; }} />);
  await user.clear(screen.getByRole("textbox", { name: "Nome (obrigatório)" }));
  await user.type(screen.getByRole("textbox", { name: "Nome (obrigatório)" }), "Novo");
  await user.click(screen.getByRole("button", { name: "Salvar registro" }));
  await waitFor(() => expect(sent).toBeDefined());
  expect(JSON.parse(String(sent!.get("draft")))).toEqual({ name: { included: true, value: "Novo" }, notes: { included: true, value: "Material: visco\n\n✨" } });
});
it("key constructor ausente inicia com texto vazio ao ser incluída", async () => {
  const user = userEvent.setup();
  render(<RecordForm fields={[{ key: "constructor", label: "Construtor", required: false, format: "text" }]} record={{ ...record, values: {} }} action={async () => ({})} />);
  await user.click(screen.getByRole("checkbox"));
  expect(screen.getByRole("textbox", { name: "Construtor" })).toHaveValue("");
});
it("revisar schema atualiza campos e fingerprint sem descartar valores removidos", async () => {
  const user = userEvent.setup();
  const currentFields = [{ ...fields[0], label: "Nome atual" }, { key: "new", label: "Novo campo", required: true, format: "text" as const }];
  let calls = 0;
  let sent: FormData | undefined;
  render(<RecordForm fields={fields} record={record} action={async (_previous, data) => { calls++; sent = data; return { schemaChanged: true, currentFields, message: "A definição deste template mudou. Revise os campos antes de salvar." }; }} />);
  await user.click(screen.getByRole("button", { name: "Salvar registro" }));
  await user.click(await screen.findByRole("button", { name: "Atualizar definição" }));
  expect(screen.getByRole("textbox", { name: "Novo campo (obrigatório)" })).toHaveValue("");
  expect(screen.getByRole("textbox", { name: "Nome atual (obrigatório)" })).toHaveValue("  Amizade  ");
  expect(screen.getByText("Material: visco", { exact: false, selector: "pre" })).toBeInTheDocument();
  await user.type(screen.getByRole("textbox", { name: "Novo campo (obrigatório)" }), "Novo valor");
  await user.click(screen.getByRole("button", { name: "Salvar registro" }));
  await waitFor(() => expect(calls).toBe(2));
  expect(JSON.parse(String(sent!.get("schemaFingerprint")))).toEqual(currentFields);
  expect(JSON.parse(String(sent!.get("draft"))).notes.value).toBe("Material: visco\n\n✨");
});
it("submissão em andamento bloqueia alterações dos campos dinâmicos", async () => {
  const user = userEvent.setup();
  let finish!: (state: RecordFormState) => void;
  render(<RecordForm fields={fields} record={record} action={() => new Promise<RecordFormState>((resolve) => { finish = resolve; })} />);
  await user.click(screen.getByRole("button", { name: "Salvar registro" }));
  const input = screen.getByRole("textbox", { name: "Nome (obrigatório)" });
  const disabled = input.matches(":disabled");
  await act(async () => finish({ message: "Falha de rede" }));
  expect(disabled).toBe(true);
  expect(input).toHaveValue("  Amizade  ");
});
it("valores removidos continuam disponíveis após erro na definição revisada", async () => {
  const user = userEvent.setup(); let calls = 0;
  const currentFields = [{ ...fields[0] }, { key: "new", label: "Novo campo", required: true, format: "text" as const }];
  render(<RecordForm fields={fields} record={record} action={async () => ++calls === 1 ? { schemaChanged: true, currentFields } : { fieldErrors: { new: "Este campo é obrigatório." } }} />);
  await user.click(screen.getByRole("button", { name: "Salvar registro" }));
  await user.click(await screen.findByRole("button", { name: "Atualizar definição" }));
  await user.click(screen.getByRole("button", { name: "Salvar registro" }));
  await screen.findByText("Este campo é obrigatório.");
  expect(screen.getByText("Material: visco", { exact: false, selector: "pre" })).toBeInTheDocument();
});
