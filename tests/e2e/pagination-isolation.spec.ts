import { expect, request, test } from "@playwright/test";
import { apiJson, apiURL, loginInBrowser, newEmail, password, registerInBrowser } from "./fixtures/api";

test("51 registros, template vazio, paginação e troca de conta", async ({ page, context }) => {
  const api = await request.newContext();
  const email = newEmail();
  try {
    await apiJson(api, "POST", "/users", { name: "Conta A", email, password });
    expect((await api.post(`${apiURL}/auth/login`, { data: { email, password } })).status()).toBe(204);
    const system = await apiJson(api, "POST", "/rpg-systems", { name: "Sistema privado A" });
    const collection = await apiJson(api, "POST", `/rpg-systems/${system.id}/collections`, { name: "Coleção privada A", identifier: "private" });
    const template = await apiJson(api, "POST", `/rpg-collections/${collection.id}/templates`, { name: "Template vazio A", identifier: "empty", fields: [] });
    for (let i = 0; i < 51; i++) await apiJson(api, "POST", `/rpg-templates/${template.id}/records`, { values: {} });
    await loginInBrowser(page, email);
    await page.goto(`/templates/${template.id}`);
    await expect(page.getByText("50 registros carregados")).toBeVisible();
    await page.getByRole("button", { name: "Carregar mais", exact: true }).click();
    await expect(page.getByText("51 registros carregados")).toBeVisible();
    await expect(page.getByRole("button", { name: "Carregar mais", exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Criar registro", exact: true }).click();
    await expect(page.getByText("Este template não possui campos. O registro será criado sem valores.")).toBeVisible();
    await page.getByRole("button", { name: "Salvar registro" }).click();
    await expect(page).toHaveURL(/\/records\/[\da-f-]+$/);
    const recordURL = page.url();
    const wide = await apiJson(api, "POST", `/rpg-collections/${collection.id}/templates`, {
      name: "L".repeat(100), identifier: "t".repeat(64),
      fields: Array.from({ length: 100 }, (_, index) => ({ key: `field_${index}`.padEnd(64, "x"), label: index === 0 ? "Texto longo" : "L".repeat(100), format: "textarea" })),
    });
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/templates/${wide.id}/edit`);
    await expect(page.getByRole("group")).toHaveCount(100);
    await expect(page.getByRole("button", { name: "Adicionar campo" })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto(`/templates/${wide.id}/records/new`);
    await page.getByRole("checkbox").first().check();
    await page.getByLabel("Texto longo", { exact: true }).fill("x".repeat(81920));
    await page.getByRole("button", { name: "Salvar registro" }).click();
    await expect(page).toHaveURL(/\/records\/[\da-f-]+$/);
    expect((await page.locator("dd").first().textContent())?.length).toBe(81920);
    const cookie = (await context.cookies()).find((entry) => entry.name === "grp-session");
    expect(cookie?.httpOnly).toBe(true);
    expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookie: document.cookie }))).toEqual({ local: 0, session: 0, cookie: "" });
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
    const emailB = newEmail();
    await registerInBrowser(page, emailB);
    await loginInBrowser(page, emailB);
    await page.goto(`/systems/${system.id}`);
    await expect(page.getByRole("heading", { name: "Recurso não encontrado" })).toBeVisible();
    await page.goto(recordURL);
    await expect(page.getByRole("heading", { name: "Recurso não encontrado" })).toBeVisible();
    const pagination = await context.request.get(`/api/templates/${template.id}/records?limit=50`);
    expect(pagination.status()).toBe(404);
  } finally { await api.dispose(); }
});
