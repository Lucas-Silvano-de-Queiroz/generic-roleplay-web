// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { RecordList } from "@/app/components/records/record-list";
import { id, otherId, record } from "../support/fixtures";

it("trocar template reinicia os itens e o cursor", () => {
  const view = render(<RecordList templateId={id} initialPage={{ items: [record], nextCursor: id }} nameKey="name" />);
  view.rerender(<RecordList templateId={otherId} initialPage={{ items: [] }} nameKey="name" />);
  expect(screen.queryByText("Amizade", { exact: false })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument();
  expect(screen.getByText("0 registros carregados")).toBeInTheDocument();
});
it("atualizar a primeira página do mesmo template descarta os itens anteriores", () => {
  const view = render(<RecordList templateId={id} initialPage={{ items: [record], nextCursor: id }} nameKey="name" />);
  view.rerender(<RecordList templateId={id} initialPage={{ items: [] }} nameKey="name" />);
  expect(screen.getByText("0 registros carregados")).toBeInTheDocument();
});
it("pagina com o cursor exato, deduplica IDs e preserva itens após erro", async () => {
  const user = userEvent.setup();
  const fetch = vi.fn().mockRejectedValueOnce(new TypeError("network")).mockResolvedValueOnce(Response.json({ items: [record, { ...record, id: otherId } ] }));
  vi.stubGlobal("fetch", fetch);
  render(<RecordList templateId={id} initialPage={{ items: [record], nextCursor: id }} />);
  await user.click(screen.getByRole("button", { name: "Carregar mais" }));
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.getByText("1 registros carregados")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Carregar mais" }));
  await waitFor(() => expect(screen.getByText("2 registros carregados")).toBeInTheDocument());
  expect(fetch.mock.calls[1][0]).toBe(`/api/templates/${id}/records?limit=50&cursor=${id}`);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
it("uma resposta atrasada não repõe registros de outro template", async () => {
  const user = userEvent.setup();
  let finish!: (value: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; })));
  const view = render(<RecordList templateId={id} initialPage={{ items: [record], nextCursor: id }} />);
  await user.click(screen.getByRole("button", { name: "Carregar mais" }));
  view.rerender(<RecordList templateId={otherId} initialPage={{ items: [] }} />);
  await act(async () => finish(Response.json({ items: [{ ...record, id: otherId }] })));
  expect(screen.getByText("0 registros carregados")).toBeInTheDocument();
});
it("uma primeira página recém-carregada reinicia a lista mesmo com conteúdo idêntico", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ items: [{ ...record, id: otherId }] })));
  const view = render(<RecordList templateId={id} initialPage={{ items: [record], nextCursor: id }} />);
  await user.click(screen.getByRole("button", { name: "Carregar mais" }));
  await screen.findByText("2 registros carregados");
  view.rerender(<RecordList templateId={id} initialPage={{ items: [record], nextCursor: id }} />);
  expect(screen.getByText("1 registros carregados")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Carregar mais" })).toBeInTheDocument();
});
