import { expect, test } from "@playwright/test";

async function completeQuickCheck(
  page: import("@playwright/test").Page,
  modality: "Pesos" | "UVR" = "Pesos",
) {
  await page.goto("/revisar");

  await page.getByRole("radio", { name: "Crédito hipotecario" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("radio", { name: modality, exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("¿Cuánto capital debes aproximadamente?").fill("180000000");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("¿Cuánto pagas aproximadamente cada mes?").fill("2100000");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("¿Cuántos años te faltan aproximadamente?").fill("17");
  await page.getByRole("button", { name: "Ver mi primera lectura" }).click();
}

test("keeps the home conceptual Mortgage Twin outside verified C3 and exposes only real routes", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Vista conceptual · no verificada", { exact: true })).toBeVisible();
  await expect(page.getByText("C3 · Verificado documentalmente", { exact: true })).toHaveCount(0);
  await expect(page.locator('a[href="#comprar"]')).toHaveCount(0);
  await expect(page.locator('a[href="#diy"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Revisar mi crédito" })).toHaveAttribute("href", "/revisar");
  await expect(page.getByRole("link", { name: "Preparar mi ruta" })).toHaveAttribute("href", "/revisar");
});

test("delivers first useful result without asking identity or contact data", async ({ page }) => {
  await completeQuickCheck(page);

  await expect(page.getByRole("heading", { name: "Ya podemos construir una primera fotografía de tu crédito." })).toBeVisible();
  await expect(page.getByText("C1 · Estimación")).toBeVisible();
  await expect(page.getByText("$ 180.000.000")).toBeVisible();

  const forbiddenInputs = ["cédula", "teléfono", "correo", "email"];
  for (const name of forbiddenInputs) {
    await expect(page.getByLabel(new RegExp(name, "i"))).toHaveCount(0);
  }
});

test("exposes task progress semantically", async ({ page }) => {
  await page.goto("/revisar");

  const progress = page.getByRole("progressbar", { name: "Progreso del Quick Check" });
  await expect(progress).toHaveAttribute("aria-valuenow", "1");
  await expect(progress).toHaveAttribute("aria-valuemax", "5");

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(progress).toHaveAttribute("aria-valuenow", "2");
});

test("allows unknown product and modality instead of blocking the journey", async ({ page }) => {
  await page.goto("/revisar");

  await page.getByRole("radio", { name: "No estoy seguro" }).first().check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("radio", { name: "No estoy seguro" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByLabel("¿Cuánto capital debes aproximadamente?")).toBeVisible();
});

test("supports keyboard-only progression through the first questions", async ({ page }) => {
  await page.goto("/revisar");

  await page.getByRole("radio", { name: "Crédito hipotecario" }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Continuar" }).focus();
  await page.keyboard.press("Enter");

  await expect(page.getByText("¿Tu crédito está en pesos o UVR?")).toBeVisible();
});

test("does not overflow horizontally on compact viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await completeQuickCheck(page);

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test("does not grant C2 from placeholder or empty financial inputs", async ({ page }) => {
  await completeQuickCheck(page, "Pesos");
  await page.getByRole("button", { name: "Continuar con más precisión" }).click();

  await page.getByRole("radio", { name: "Cuota constante en pesos" }).check();
  await expect(page.getByText("C2 · Simulación modelada", { exact: true })).toHaveCount(0);

  await page.getByLabel("Tasa efectiva anual del crédito").fill("12");
  await expect(page.getByText("C2 · Simulación modelada", { exact: true })).toHaveCount(0);
});

test("upgrades a compatible peso case from C1 to a real C2 modeled scenario", async ({ page }) => {
  await completeQuickCheck(page, "Pesos");
  await page.getByRole("button", { name: "Continuar con más precisión" }).click();

  await page.getByLabel("Tasa efectiva anual del crédito").fill("12");
  await page.getByLabel("Número de cuotas que te faltan").fill("204");
  await page.getByRole("radio", { name: "Cuota constante en pesos" }).check();

  await expect(page.getByText("C2 · Simulación modelada", { exact: true })).toBeVisible();
  await expect(page.getByText("Capital adicional que aportarías durante el escenario")).toBeVisible();
  await expect(page.getByText("Intereses futuros nominales que el modelo estima que dejarían de causarse")).toBeVisible();
  await expect(page.getByText("Valor atribuible a VIVIENDA en esta simulación self-service")).toBeVisible();
});

test("refuses to apply the peso annuity model to UVR", async ({ page }) => {
  await completeQuickCheck(page, "UVR");
  await page.getByRole("button", { name: "Continuar con más precisión" }).click();

  await expect(page.getByText("No vamos a forzar una fórmula de pesos.")).toBeVisible();
  await expect(page.getByText("C2 · Simulación modelada", { exact: true })).toHaveCount(0);
});

test("rejects unsupported document types before the verification review", async ({ page }) => {
  await page.goto("/verificar");

  await page.getByLabel("Selecciona un extracto para probar la experiencia").setInputFiles({
    name: "notas.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("demo"),
  });

  await expect(page.locator("#statement-file-error")).toHaveText("Usa un archivo PDF, JPG o PNG.");
  await expect(page.getByRole("heading", { name: "Revisa campo por campo antes de usarlo." })).toHaveCount(0);
});

test("never grants C3 from simulated document values, even after all material fields are confirmed", async ({ page }) => {
  await page.goto("/verificar");

  await page.getByLabel("Selecciona un extracto para probar la experiencia").setInputFiles({
    name: "extracto-demo.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 demo"),
  });

  const confirmationBoxes = page.locator('input[type="checkbox"]:not(:disabled)');
  await expect(confirmationBoxes).toHaveCount(6);

  for (let index = 0; index < 6; index += 1) {
    await confirmationBoxes.nth(index).check();
  }

  await expect(page.getByText("6 de 6 campos materiales confirmados")).toBeVisible();
  await expect(page.getByText("La reconciliación de la demostración está completa, pero sigue siendo C2.")).toBeVisible();
  await expect(page.getByText("C3 · Verificado documentalmente", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Previsualizar Mortgage Twin" }).click();

  await expect(page.getByRole("heading", { name: "Así quedará tu crédito cuando la evidencia sea verificable." })).toBeVisible();
  await expect(page.getByText("Preview, no C3.")).toBeVisible();
  await expect(page.getByText("C3 · Verificado documentalmente", { exact: true })).toHaveCount(0);
});
