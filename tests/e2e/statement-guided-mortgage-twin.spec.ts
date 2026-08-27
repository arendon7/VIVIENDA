import { expect, test } from "@playwright/test";

async function selectLocalStatement(page: import("@playwright/test").Page) {
  await page.goto("/verificar");
  await page.getByLabel("Seleccionar extracto local").setInputFiles({
    name: "mi-extracto-privado.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 local-reference-only"),
  });
  await expect(page.getByRole("heading", { name: "Mira tu extracto y completa solo lo que puedas identificar con seguridad." })).toBeVisible();
}

async function fillBaseSnapshot(
  page: import("@playwright/test").Page,
  options: { product?: "mortgage" | "leasing"; modality?: "pesos" | "uvr" } = {},
) {
  const product = options.product ?? "mortgage";
  const modality = options.modality ?? "pesos";

  await page.getByLabel("Fecha de corte del extracto").fill("2026-08-15");
  await page.getByRole("radio", {
    name: product === "mortgage" ? "Crédito hipotecario de vivienda" : "Leasing habitacional",
  }).first().check();
  await page.getByRole("radio", { name: modality === "pesos" ? "Pesos" : "UVR", exact: true }).first().check();
  await page.getByLabel("Saldo de capital (COP)").fill("180000000");
}

async function buildBaseSnapshot(
  page: import("@playwright/test").Page,
  options: { product?: "mortgage" | "leasing"; modality?: "pesos" | "uvr" } = {},
) {
  await selectLocalStatement(page);
  await fillBaseSnapshot(page, options);
  await page.getByRole("button", { name: "Construir mi Mortgage Twin" }).click();
  await expect(page.getByRole("heading", { name: "Tu fotografía declarada ya tiene la base material del snapshot." })).toBeVisible();
}

async function buildCompatibleModeledSnapshot(page: import("@playwright/test").Page, extra = "200000") {
  await selectLocalStatement(page);
  await fillBaseSnapshot(page);
  await page.getByLabel("Tasa efectiva anual — EA (%)").fill("12");
  await page.getByLabel("Cuotas restantes").fill("204");
  await page.getByRole("radio", { name: "Cuota constante en pesos" }).first().check();
  await page.getByRole("button", { name: "Construir mi Mortgage Twin" }).click();
  await page.getByLabel("Abono adicional mensual que quieres probar (COP)").fill(extra);
  await page.getByRole("button", { name: "Modelar este abono" }).click();
  await expect(page.getByText("Escenario de prepago · C2", { exact: true })).toBeVisible();
}

test("opens guided transcription with no extracted or simulated financial values", async ({ page }) => {
  await selectLocalStatement(page);

  await expect(page.getByLabel("Saldo de capital (COP)")).toHaveValue("");
  await expect(page.getByLabel("Tasa efectiva anual — EA (%)")).toHaveValue("");
  await expect(page.getByLabel("Cuotas restantes")).toHaveValue("");
  await expect(page.getByText("Demostración · extracción simulada", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Extraído", { exact: true })).toHaveCount(0);
  await expect(page.getByText("No hay valores precargados ni una extracción simulada. Si un dato no está claro, conserva la incertidumbre.", { exact: true })).toBeVisible();
  await expect(page.getByText(/El archivo permanece local/i)).toBeVisible();
});

test("keeps the local-reference filename ephemeral and the completed snapshot at C1", async ({ page }) => {
  await buildBaseSnapshot(page);

  const twin = page.locator('section[aria-labelledby="mortgage-twin-title"]');
  await expect(page.getByText("Mortgage Twin guiado · C1", { exact: true })).toBeVisible();
  await expect(twin.getByLabel("Nivel de precisión: Estimación")).toHaveText("C1 · Estimación");
  await expect(page.getByText("C3 · Verificado documentalmente", { exact: true })).toHaveCount(0);
  await expect(twin.getByText("Datos transcritos por ti desde un extracto local. VIVIENDA no leyó ni verificó el archivo.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/verificar$/);
  expect(page.url()).not.toContain("mi-extracto-privado");
  expect(page.url()).not.toContain("180000000");
});

test("does not let invalid optional context block an otherwise valid C1 snapshot", async ({ page }) => {
  await selectLocalStatement(page);
  await fillBaseSnapshot(page);
  await page.getByLabel("Pago, cuota o canon total más reciente (COP)").fill("0");
  await page.getByLabel("Seguros o costos mensuales identificables (COP)").fill("-1");
  await page.getByRole("button", { name: "Construir mi Mortgage Twin" }).click();

  await expect(page.getByRole("heading", { name: "Tu fotografía declarada ya tiene la base material del snapshot." })).toBeVisible();
  await expect(page.getByText("Hay un dato opcional que conviene revisar.", { exact: true })).toBeVisible();
  await expect(page.getByText("Esto no invalida el Mortgage Twin ni bloquea un modelo compatible.", { exact: true })).toBeVisible();
});

test("carries the exact C2 term-prepayment model into Loan Health and invalidates it when inputs change", async ({ page }) => {
  await buildCompatibleModeledSnapshot(page);

  await expect(page.getByText(/Datos base C1 transcritos por ti \+ motor determinístico C2/)).toBeVisible();
  await expect(page.getByText("C3 · Verificado documentalmente", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Capital adicional aportado por ti", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Ver mi Loan Health y rutas" }).click();

  const workspace = page.locator('section[aria-labelledby="opportunity-workspace-title"]');
  await expect(workspace).toBeVisible();
  await expect(workspace.getByText("C1 · fuente base", { exact: true })).toBeVisible();
  await expect(workspace.getByText("R1 · C2 modelado", { exact: true })).toBeVisible();
  await expect(workspace.getByLabel("3. ¿Cuánto capital adicional quieres comparar?")).toHaveValue("200000");
  await expect(workspace.getByText(/Ya modelaste .*200\.000.* adicionales al mes/i)).toBeVisible();

  const prepaymentHealth = workspace.locator('[data-loan-health-dimension="prepayment"]');
  await expect(prepaymentHealth.getByText("Lista para comparar", { exact: true })).toBeVisible();
  await expect(workspace.getByRole("heading", { name: "Existe al menos una acción concreta que puedes comparar con los datos actuales." })).toBeVisible();
  await expect(workspace.getByText(/R1_PREPAGO_PLAZO C2/)).toBeVisible();

  const r1 = workspace.locator("article").filter({ hasText: "R1_PREPAGO_PLAZO" }).last();
  const r2 = workspace.locator("article").filter({ hasText: "R2_PREPAGO_CUOTA" }).last();
  await expect(r1.getByText(/R1_PREPAGO_PLAZO · precisión C2 solo para esta ruta/)).toBeVisible();
  await expect(r2.getByText(/R2_PREPAGO_CUOTA · precisión C1/)).toBeVisible();

  await workspace.getByLabel("3. ¿Cuánto capital adicional quieres comparar?").fill("250000");

  await expect(workspace.getByText("R1 · C2 modelado", { exact: true })).toHaveCount(0);
  await expect(workspace.getByText(/El escenario C2 anterior ya no coincide con estos datos/)).toBeVisible();
  await expect(r1.getByText(/R1_PREPAGO_PLAZO · precisión C1/)).toBeVisible();
  await expect(prepaymentHealth.getByText("Explorar", { exact: true })).toBeVisible();
  await expect(workspace.getByRole("heading", { name: "La siguiente mejora de valor es aumentar la precisión antes de tomar una decisión material." })).toBeVisible();
});

test("keeps a UVR Mortgage Twin useful without applying the constant-payment-pesos model", async ({ page }) => {
  await buildBaseSnapshot(page, { modality: "uvr" });

  await expect(page.getByText("No vamos a aplicar una fórmula de cuota constante en pesos a este crédito UVR.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Modelar este abono" })).toHaveCount(0);
  await expect(page.getByText("Mortgage Twin guiado · C1", { exact: true })).toBeVisible();
});

test("keeps housing leasing separate from the mortgage prepayment model", async ({ page }) => {
  await buildBaseSnapshot(page, { product: "leasing" });

  await expect(page.getByText("Este snapshot corresponde a leasing habitacional.", { exact: true })).toBeVisible();
  await expect(page.getByText(/No aplicamos automáticamente el modelo de prepago de crédito hipotecario/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Modelar este abono" })).toHaveCount(0);
});

test("carries product and modality from the C1 Mortgage Twin into Loan Health before route execution", async ({ page }) => {
  await buildBaseSnapshot(page);
  await page.getByRole("button", { name: "Ver mi Loan Health y rutas" }).click();

  const workspace = page.locator('section[aria-labelledby="opportunity-workspace-title"]');
  await expect(workspace).toBeVisible();
  await expect(workspace.getByRole("radio", { name: "Crédito hipotecario de vivienda" })).toBeChecked();
  await expect(workspace.getByText(/Mortgage Twin C1 · corte 2026-08-15 · producto: Crédito hipotecario de vivienda · modalidad: Pesos/)).toBeVisible();
  await expect(workspace.getByText("C1 · fuente base", { exact: true })).toBeVisible();
  await expect(workspace.getByText("R1 · C2 modelado", { exact: true })).toHaveCount(0);
  await expect(workspace.getByText("Loan Health · estado de decisión", { exact: true })).toBeVisible();
  await expect(workspace.locator('[data-loan-health-dimension="prepayment"]').getByText("Explorar", { exact: true })).toBeVisible();
});

test("keeps professional review above a modeled optimization", async ({ page }) => {
  await buildCompatibleModeledSnapshot(page);
  await page.getByRole("button", { name: "Ver mi Loan Health y rutas" }).click();

  const workspace = page.locator('section[aria-labelledby="opportunity-workspace-title"]');
  await workspace.getByLabel("6. ¿Cuál es el estado de pago/cobranza?").selectOption("executive");

  await expect(workspace.getByRole("heading", { name: "Hay una situación que debe revisarse profesionalmente antes de priorizar optimizaciones ordinarias." })).toBeVisible();
  await expect(workspace.locator('[data-loan-health-dimension="procedural_state"]').getByText("Revisión profesional", { exact: true })).toBeVisible();
  await expect(workspace.getByText("R1 · C2 modelado", { exact: true })).toBeVisible();

  const firstRoute = workspace.locator(".extraction-row").first();
  await expect(firstRoute).toContainText("R10_EXECUTIVE_DEFENSE");
  await expect(firstRoute).toContainText("precisión C1");
});

test("moves keyboard focus into downstream Loan Health routing when the user opens it", async ({ page }) => {
  await buildBaseSnapshot(page);
  const button = page.getByRole("button", { name: "Ver mi Loan Health y rutas" });
  await button.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#guided-opportunity-router")).toBeFocused();
  await expect(page.getByRole("heading", { name: "Entiende primero el estado de decisión; después elige una ruta." })).toBeVisible();
  await expect(page.getByText("Loan Health · estado de decisión", { exact: true })).toBeVisible();
});

test("does not overflow horizontally on a compact guided Mortgage Twin and Loan Health journey", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await buildBaseSnapshot(page);
  await page.getByRole("button", { name: "Ver mi Loan Health y rutas" }).click();

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});