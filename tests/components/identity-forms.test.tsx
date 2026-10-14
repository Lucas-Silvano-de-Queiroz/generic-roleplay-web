// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { RegisterForm } from "@/app/(auth)/register/register-form";
import { DeleteAccountForm } from "@/app/(authenticated)/settings/account/delete-account-form";

vi.mock("@/app/actions/register", () => ({ registerUser: async () => ({ fieldErrors: { email: "E-mail em uso" } }) }));
vi.mock("@/app/actions/account", () => ({ deleteAccount: async () => ({ fieldErrors: { password: "A senha está incorreta." } }) }));
it("erro do cadastro preserva nome e e-mail e foca o campo", async () => {
  const user = userEvent.setup(); render(<RegisterForm />);
  await user.type(screen.getByLabelText("Nome"), "Pessoa");
  await user.type(screen.getByLabelText("Email"), "a@example.com");
  await user.type(screen.getByLabelText("Senha", { exact: true }), "password");
  await user.type(screen.getByLabelText("Confirmar senha"), "password");
  await user.click(screen.getByRole("button", { name: "Cadastrar" }));
  await screen.findByText("E-mail em uso");
  expect(screen.getByLabelText("Nome")).toHaveValue("Pessoa");
  expect(screen.getByLabelText("Email")).toHaveValue("a@example.com");
  expect(screen.getByLabelText("Email")).toHaveFocus();
});
it("senha incorreta preserva confirmação explícita e rascunho", async () => {
  const user = userEvent.setup(); render(<DeleteAccountForm />);
  await user.click(screen.getByRole("button", { name: "Excluir minha conta" }));
  await user.type(screen.getByLabelText("Senha atual"), "wrongpass");
  await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
  await screen.findByText("A senha está incorreta.");
  expect(screen.getByRole("checkbox")).toBeChecked();
  expect(screen.getByLabelText("Senha atual")).toHaveValue("wrongpass");
});
