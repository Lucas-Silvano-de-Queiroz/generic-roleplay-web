import { expect, test } from "@playwright/test";
import { loginInBrowser, newEmail, password, registerInBrowser } from "./fixtures/api";

test("senha incorreta preserva a sessão e exclusão confirmada remove o acesso", async ({ page, context }) => {
  const email = newEmail();
  await registerInBrowser(page, email);
  await loginInBrowser(page, email);
  await page.goto("/settings/account");
  await page.getByRole("button", { name: "Excluir minha conta", exact: true }).click();
  await page.getByLabel("Senha atual", { exact: true }).fill("incorrect-password");
  await page.getByLabel("Quero excluir minha conta", { exact: true }).check();
  await page.getByRole("button", { name: "Confirmar exclusão", exact: true }).click();
  await expect(page.getByText("A senha está incorreta.", { exact: true })).toBeVisible();
  expect((await context.cookies()).some((cookie) => cookie.name === "grp-session")).toBe(true);
  await expect(page.getByLabel("Senha atual", { exact: true })).toBeFocused();
  await page.getByLabel("Senha atual", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Confirmar exclusão", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?deleted=1$/);
  await expect(page.getByText("Conta excluída.", { exact: true })).toBeVisible();
  expect((await context.cookies()).some((cookie) => cookie.name === "grp-session")).toBe(false);
  await page.goto("/systems");
  await expect(page).toHaveURL(/\/login/);
});
