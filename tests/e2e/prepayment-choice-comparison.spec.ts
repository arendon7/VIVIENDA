import { expect, test } from "@playwright/test";

async function openCompatibleWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/verificar");
  await page.getByLabel("Seleccionar extracto local").setInputFiles({
    name: "extracto-local.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 local-reference-only"),
  });

  await page.getByLabel("Fecha de corte del extracto").fill("2026-08-15");
  await page.getByRole("radio", { name: "Crédito hipotecario de vivienda" }).first().check();
  await page.getByRole("radio", { name: "Pesos", exact: true }).first().check();
  await page.getByLabel("Saldo de capital (COP)").fill("200000000");
  await page.getByLabel("Tasa efectiva anual — EA (%)").fill("12");
  await page.getByLabel("Cuotas restantes").fill("180");
  await page.getByRole("radio", { name: "Cuota constante en pesos" }).first().check();
  await page.getByRole("button", { name: "Organizar mi situación" }).click();
  await expect(page.getByRole("heading", { name: "Ya organizamos los datos base de tu situación." })).toBeVisible();

  await page.getByRole("button", { name: "Ver mi situación y oportunidades" }).click();
  const workspace = page.locator('section[aria-labelledby="opportunity-workspace-title"]');
  await expect(workspace).toBeVisible();
  await expect(workspace.getByRole("heading", { name: "Entiende tu situación, descubre qué merece atención y compara las opciones que ya tienen suficiente información." })).toBeVisible();
  return workspace;
}

async function modelTwentyMillion(page: import("@playwright/test").Page) {
  const workspace = await openCompatibleWorkspace(page);
  await workspace.getByLabel("Abono único que quieres comparar (COP)").fill("20000000");
  await workspace.getByRole("button", { name: "Comparar reducir plazo vs. reducir cuota" }).click();
  await expect(workspace.getByText("Dos opciones · C2 modelado", { exact: true })).toBeVisible();
  await expect(workspace.getByText("Reducir plazo · C2", { exact: true })).toBeVisible();
  await expect(workspace.getByText("Reducir cuota · C2", { exact: true })).toBeVisible();
  return workspace;
}

test("models the same immediate partial prepayment under reduce-term and reduce-payment instructions", async ({ page }) => {
  const workspace = await modelTwentyMillion(page);

  const reduceTerm = workspace.locator('article[aria-labelledby="reduce-term-title"]');
  const reducePayment = workspace.locator('article[aria-labelledby="reduce-payment-title"]');

  await expect(reduceTerm).toHaveAttribute("data-route-code", "R1_PREPAGO_PLAZO");
  await expect(reducePayment).toHaveAttribute("data-route-code", "R2_PREPAGO_CUOTA");
  await expect(workspace.getByText(/Abono único:.*20\.000\.000/)).toBeVisible();
  await expect(reduceTerm).toContainText("141 cuotas");
  await expect(reduceTerm).toContainText("39 cuotas");
  await expect(reduceTerm).toContainText(/70\.904\.89[0-9]/);

  await expect(reducePayment).toContainText(/2\.089\.777/);
  await expect(reducePayment).toContainText(/232\.197/);
  await expect(reducePayment).toContainText(/10\s?%/);
  await expect(reducePayment).toContainText("180 cuotas");
  await expect(reducePayment).toContainText(/21\.795\.54[0-9]/);

  const r1 = workspace.locator('.extraction-row[data-route-code="R1_PREPAGO_PLAZO"]');
  const r2 = workspace.locator('.extraction-row[data-route-code="R2_PREPAGO_CUOTA"]');
  const r3 = workspace.locator('.extraction-row[data-route-code="R3_RESTRUCTURACION_546_20"]');
  const r5 = workspace.locator('.extraction-row[data-route-code="R5_CESION_546_24"]');

  await expect(r1.getByText("Precisión C2 solo para esta opción", { exact: true })).toBeVisible();
  await expect(r2.getByText("Precisión C2 solo para esta opción", { exact: true })).toBeVisible();
  await expect(r3.getByText("Precisión C1", { exact: true })).toBeVisible();
  await expect(r5.getByText("Precisión C1", { exact: true })).toBeVisible();
  await expect(workspace.getByText("R1_PREPAGO_PLAZO", { exact: true })).toHaveCount(0);
  await expect(workspace.getByText("R2_PREPAGO_CUOTA", { exact: true })).toHaveCount(0);
  await expect(workspace.getByText("La comparación no elige por ti.", { exact: true })).toBeVisible();
});

test("invalidates both route-specific C2 states as soon as the modeled lump sum changes", async ({ page }) => {
  const workspace = await modelTwentyMillion(page);

  await workspace.getByLabel("Abono único que quieres comparar (COP)").fill("25000000");

  await expect(workspace.getByText("Dos opciones · C2 modelado", { exact: true })).toHaveCount(0);
  await expect(workspace.getByText("Reducir plazo · C2", { exact: true })).toHaveCount(0);
  await expect(workspace.getByText("Reducir cuota · C2", { exact: true })).toHaveCount(0);
  await expect(workspace.locator('[data-loan-health-dimension="prepayment"]').getByText("Explorar", { exact: true })).toBeVisible();
  await expect(workspace.locator('.extraction-row[data-route-code="R1_PREPAGO_PLAZO"]')).toHaveCount(0);
  await expect(workspace.locator('.extraction-row[data-route-code="R2_PREPAGO_CUOTA"]')).toHaveCount(0);
});

test("keeps professional review above both modeled prepayment optimizations", async ({ page }) => {
  const workspace = await modelTwentyMillion(page);

  await workspace.getByLabel("6. ¿Cuál es el estado de pago/cobranza?").selectOption("executive");

  await expect(workspace.getByRole("heading", { name: "Hay una situación que debe revisarse profesionalmente antes de priorizar optimizaciones ordinarias." })).toBeVisible();
  await expect(workspace.getByText("Reducir plazo · C2", { exact: true })).toBeVisible();
  await expect(workspace.getByText("Reducir cuota · C2", { exact: true })).toBeVisible();

  const firstRoute = workspace.locator(".extraction-row").first();
  await expect(firstRoute).toHaveAttribute("data-route-code", "R10_EXECUTIVE_DEFENSE");
  await expect(firstRoute.getByText("Precisión C1", { exact: true })).toBeVisible();
  await expect(firstRoute.getByText("R10_EXECUTIVE_DEFENSE", { exact: true })).toHaveCount(0);
});

test("keeps the comparison and route cards usable without horizontal overflow at 390 px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const workspace = await modelTwentyMillion(page);

  await expect(workspace.getByRole("heading", { name: "Compara el mismo abono parcial: reducir plazo vs. reducir cuota." })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
