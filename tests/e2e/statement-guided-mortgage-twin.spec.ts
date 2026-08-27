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

test("creates C2 only after a compatible peso mortgage has explicit model data and user extra principal", async ({ page }) => {
  await selectLocalStatement(page);
  await fillBaseSnapshot(page);
  await page.getByLabel("Tasa efectiva anual — EA (%)").fill("12");
  await page.getByLabel("Cuotas restantes").fill("204");
  await page.getByRole("radio", { name: "Cuota constante en pesos" }).first().check();
  await page.getByRole("button", { name: "Construir mi Mortgage Twin" }).click();

  await expect(page.getByText("Escenario de prepago · C2", { exact: true })).toHaveCount(0);
  await page.getByLabel("Abono adicional mensual que quieres probar (COP)").fill("200000");
  await page.getByRole("button", { name: "Modelar este abono" }).click();

  await expect(page.getByText("Escenario de prepago · C2", { exact: true })).toBeVisible();
  await expect(page.getByText(/Datos base C1 transcritos por ti \+ motor determinístico C2/)).toBeVisible();
  await expect(page.getByText("C3 · Verificado documentalmente", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Capital adicional aportado por ti", { exact: true })).toBeVisible();
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

test("carries product and modality from the C1 Mortgage Twin into downstream decision routing", async ({ page }) => {
  await buildBaseSnapshot(page);
  await page.getByRole("button", { name: "Explorar mis próximas decisiones" }).click();

  const workspace = page.locator('section[aria-labelledby="opportunity-workspace-title"]');
  await expect(workspace).toBeVisible();
  await expect(workspace.getByRole("radio", { name: "Crédito hipotecario de vivienda" })).toBeChecked();
  await expect(workspace.getByText(/Mortgage Twin C1 · corte 2026-08-15 · producto: Crédito hipotecario de vivienda · modalidad: Pesos/)).toBeVisible();
  await expect(workspace.getByText("C1 · evidencia actual", { exact: true })).toBeVisible();
});

test("moves keyboard focus into downstream routing when the user opens it", async ({ page }) => {
  await buildBaseSnapshot(page);
  const button = page.getByRole("button", { name: "Explorar mis próximas decisiones" });
  await button.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#guided-opportunity-router")).toBeFocused();
  await expect(page.getByRole("heading", { name: "Convierte el Mortgage Twin en próximas decisiones posibles." })).toBeVisible();
});

test("does not overflow horizontally on a compact guided Mortgage Twin journey", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await buildBaseSnapshot(page);
  await page.getByRole("button", { name: "Explorar mis próximas decisiones" }).click();

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});