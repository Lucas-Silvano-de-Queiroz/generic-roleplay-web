import { randomUUID } from "node:crypto";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const apiURL = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:3451";
export const password = "grp-test-password-123";
export function newEmail() { return `grp-${randomUUID()}@example.com`; }
export async function registerInBrowser(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Nome", { exact: true }).fill("Pessoa de teste");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByLabel("Confirmar senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?registered=1$/);
  await expect(page.getByText("Conta criada. Entre para continuar.")).toBeVisible();
}
export async function loginInBrowser(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/systems$/);
}
export async function apiJson(api: APIRequestContext, method: "POST" | "PATCH" | "GET", path: string, data?: unknown) {
  const response = await api.fetch(`${apiURL}${path}`, { method, data });
  expect(response.ok(), `${method} ${path}: ${response.status()}`).toBeTruthy();
  return response.json();
}
export async function confirmDelete(page: Page) {
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar exclusão", exact: true }).click();
}
