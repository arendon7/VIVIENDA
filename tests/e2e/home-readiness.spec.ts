import { expect, test, type Page } from "@playwright/test";

async function completeReadinessQuestions(page: Page) {
  await page.getByRole("button", { name: "Completar mi preparación" }).click();
  await page.getByLabel("Tengo una historia comparable de 12 meses o más").check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Tengo organizados los soportes principales").check();
  await page.getByRole("button", { name: "Continuar" }).click();
}

async function buildAffordabilityC2(page: Page) {
  await page.goto("/comprar/cuanto-puedo-comprar");
  await page.getByLabel("Ingreso neto mensual del hogar").fill("10000000");
  await page.getByLabel("Cuotas mensuales de otras deudas").fill("1000000");
  await page.getByLabel("Cuota inicial disponible").fill("120000000");
  await page.getByLabel("No VIS").check();
  await page.getByRole("button", { name: "Calcular mi rango" }).click();
  await page.getByRole("button", { name: "Modelar con tasa y plazo" }).click();
  await page.getByLabel("Tasa efectiva anual del escenario (%)").fill("11.7");
  await page.getByLabel("Plazo del escenario (años)").fill("20");
  await page.getByLabel("Otros costos mensuales de vivienda (opcional)").fill("300000");
  await page.getByRole("button", { name: "Ver escenario modelado" }).click();
}

test.describe("Home Readiness v0.16", () => {
  test("shows an honest partial profile before producing a 0–100 total", async ({ page }) => {
    await page.goto("/comprar/preparacion");

    await expect(page.getByRole("heading", { name: "¿Qué tan preparado está hoy tu plan de compra?" })).toBeVisible();
    await expect(page.getByText("No necesitas nombre, cédula, correo, teléfono ni consulta a centrales")).toBeVisible();

    await page.getByLabel("Ingreso neto mensual del hogar").fill("10000000");
    await page.getByLabel("Cuotas mensuales de otras deudas").fill("1000000");
    await page.getByLabel("Cuota inicial disponible").fill("120000000");
    await page.getByLabel("Precio de la vivienda que tienes en mente").fill("300000000");
    await page.getByLabel("No VIS").check();
    await page.getByRole("button", { name: "Ver mi punto de partida" }).click();

    await expect(page.getByRole("heading", { name: "Perfil incompleto" })).toBeFocused();
    await expect(page.getByText("No completamos los datos faltantes con supuestos para fabricar un puntaje.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Continuidad de ingresos" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Preparación documental" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Encaje del objetivo" })).toBeVisible();
    await expect(page.getByText("Falta información")).toHaveCount(3);
    await expect(page.getByText("/100", { exact: true })).toHaveCount(0);
  });

  test("completes the five-dimension index from user-supplied planning assumptions", async ({ page }) => {
    await page.goto("/comprar/preparacion");
    await page.getByLabel("Ingreso neto mensual del hogar").fill("10000000");
    await page.getByLabel("Cuotas mensuales de otras deudas").fill("1000000");
    await page.getByLabel("Cuota inicial disponible").fill("120000000");
    await page.getByLabel("Precio de la vivienda que tienes en mente").fill("280000000");
    await page.getByLabel("No VIS").check();
    await page.getByRole("button", { name: "Ver mi punto de partida" }).click();

    await completeReadinessQuestions(page);

    await expect(page.getByText("VIVIENDA no inserta una tasa de mercado ni supone una oferta bancaria.")).toBeVisible();
    await page.getByLabel("Tasa efectiva anual del escenario (%)").fill("11.7");
    await page.getByLabel("Plazo del escenario (años)").fill("20");
    await page.getByLabel("Otros costos mensuales de vivienda (opcional)").fill("300000");
    await page.getByRole("button", { name: "Usar este escenario y completar el índice" }).click();

    await expect(page.getByText("Índice completo", { exact: true })).toBeVisible();
    await expect(page.getByText("/100", { exact: true })).toBeVisible();
    await expect(page.getByText("No es DataCrédito, score bancario, preaprobación ni probabilidad de aprobación.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Los cálculos base se muestran aparte del índice." })).toBeVisible();

    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("te aprobarán");
    expect(body).not.toContain("probabilidad de éxito");
    expect(body).not.toContain("tu score bancario");

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test("continues from affordability C2 without re-entering validated financial facts", async ({ page }) => {
    await buildAffordabilityC2(page);
    await page.getByRole("button", { name: "Conocer mi preparación" }).click();

    await expect(page).toHaveURL(/\/comprar\/cuanto-puedo-comprar$/);
    await expect(page.getByRole("heading", { name: "Convierte tu rango en un plan de compra." })).toBeVisible();

    const reused = page.getByLabel("Datos reutilizados del cálculo de capacidad");
    await expect(reused).toContainText("$ 10.000.000");
    await expect(reused).toContainText("$ 1.000.000");
    await expect(reused).toContainText("$ 120.000.000");
    await expect(reused).toContainText("No VIS");
    await expect(page.getByLabel("Ingreso neto mensual del hogar")).toHaveCount(0);
    await expect(page.getByLabel("Cuotas mensuales de otras deudas")).toHaveCount(0);
    await expect(page.getByLabel("Cuota inicial disponible")).toHaveCount(0);

    await page.getByLabel("Precio de la vivienda que tienes en mente").fill("280000000");
    await page.getByRole("button", { name: "Ver mi punto de partida" }).click();
    await completeReadinessQuestions(page);

    await expect(page.getByText("Ya cargamos el escenario que modelaste antes. Puedes usarlo o editarlo.")).toBeVisible();
    await expect(page.getByLabel("Tasa efectiva anual del escenario (%)")).toHaveValue("11.7");
    await expect(page.getByLabel("Plazo del escenario (años)")).toHaveValue("20");
    await expect(page.getByLabel("Otros costos mensuales de vivienda (opcional)")).toHaveValue("300000");
    await page.getByRole("button", { name: "Usar este escenario y completar el índice" }).click();

    await expect(page.getByText("Índice completo", { exact: true })).toBeVisible();
    await expect(page.getByText("/100", { exact: true })).toBeVisible();
  });

  test("returns from embedded readiness to editable affordability without losing base values", async ({ page }) => {
    await buildAffordabilityC2(page);
    await page.getByRole("button", { name: "Conocer mi preparación" }).click();
    await page.getByRole("button", { name: "Editar cálculo anterior" }).click();

    await expect(page.getByRole("heading", { name: "¿Qué rango de vivienda tiene sentido planear?" })).toBeVisible();
    await expect(page.getByLabel("Ingreso neto mensual del hogar")).toHaveValue("10000000");
    await expect(page.getByLabel("Cuotas mensuales de otras deudas")).toHaveValue("1000000");
    await expect(page.getByLabel("Cuota inicial disponible")).toHaveValue("120000000");
    await expect(page.getByLabel("No VIS")).toBeChecked();
  });

  test("Home exposes readiness as a secondary buyer path without replacing borrower primary CTA", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Revisar mi crédito" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Calcular cuánto puedo planear" })).toHaveAttribute("href", "/comprar/cuanto-puedo-comprar");
    await expect(page.getByRole("link", { name: "Conocer mi preparación" })).toHaveAttribute("href", "/comprar/preparacion");
  });
});
