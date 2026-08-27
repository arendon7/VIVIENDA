import { expect, type Page, test } from "@playwright/test";

async function fillCompleteMortgageQuote(page: Page, provider: string) {
  await page.getByLabel("Entidad o proveedor").fill(provider);
  await page.getByLabel("Fecha de la cotización").fill("2026-08-20");
  await page.getByLabel("Vigente hasta").fill("2026-09-20");
  await page.getByLabel("Crédito hipotecario").check();
  await page.getByRole("radio", { name: /^Pesos/ }).check();
  await page.getByLabel("Valor del inmueble (COP)").fill("500000000");
  await page.getByLabel("Monto financiado (COP)").fill("350000000");
  await page.getByLabel("Porcentaje financiado declarado (%)").fill("70");
  await page.getByLabel("Plazo (meses)").fill("240");
  await page.getByLabel("Cuota inicial del crédito (COP/mes)").fill("3600000");
  await page.getByLabel("Tasa declarada (%)").fill("11");
  await page.getByLabel("Convención de tasa").selectOption({ label: "Efectiva anual (EA)" });
  await page.getByLabel("Comportamiento de cuota o canon").selectOption({ label: "Cuota nominal constante" });
  await page.getByLabel("¿Cómo trata la cotización los seguros?").selectOption({ label: "Incluidos en la cuota/canon declarado" });
  await page.getByLabel("¿Cómo aparecen los costos de una sola vez?").selectOption({ label: "La cotización declara que no hay" });
  await page.getByLabel("Efectivo total requerido al cierre (COP)").fill("150000000");
  await page.getByLabel("Información de prepago").selectOption({ label: "La cotización lo declara sin restricciones" });
}

async function fillCompleteLeasingQuote(page: Page, provider: string) {
  await page.getByLabel("Entidad o proveedor").fill(provider);
  await page.getByLabel("Fecha de la cotización").fill("2026-08-21");
  await page.getByLabel("Vigente hasta").fill("2026-09-21");
  await page.getByLabel("Leasing habitacional").check();
  await page.getByRole("radio", { name: /^Pesos/ }).check();
  await page.getByLabel("Valor del inmueble (COP)").fill("500000000");
  await page.getByLabel("Monto financiado (COP)").fill("325000000");
  await page.getByLabel("Porcentaje financiado declarado (%)").fill("65");
  await page.getByLabel("Plazo (meses)").fill("180");
  await page.getByLabel("Canon inicial (COP/mes)").fill("3450000");
  await page.getByLabel("Tasa declarada (%)").fill("10.5");
  await page.getByLabel("Convención de tasa").selectOption({ label: "Efectiva anual (EA)" });
  await page.getByLabel("Comportamiento de cuota o canon").selectOption({ label: "Cuota nominal constante" });
  await page.getByLabel("¿Cómo trata la cotización los seguros?").selectOption({ label: "Excluidos de la cuota/canon declarado" });
  await page.getByLabel("Seguros mensuales adicionales (COP)").fill("180000");
  await page.getByLabel("¿Cómo aparecen los costos de una sola vez?").selectOption({ label: "Solo total" });
  await page.getByLabel("Total de costos de una sola vez (COP)").fill("3500000");
  await page.getByLabel("Efectivo total requerido al cierre (COP)").fill("178500000");
  await page.getByLabel("Información de prepago").selectOption({ label: "La cotización lo declara sin restricciones" });
  await page.getByRole("button", { name: "Porcentaje" }).click();
  await page.getByLabel("Opción de compra (%)").fill("10");
  await page.getByLabel("¿Cuándo se ejerce o paga la opción?").fill("Al finalizar el contrato");
}

test.describe("Quote Normalization v0.18", () => {
  test("returns missing structural fields instead of inventing a comparison", async ({ page }) => {
    await page.goto("/comprar/comparar-cotizaciones");

    await expect(page.getByRole("heading", { name: "Pon tu cotización sobre una base comparable" })).toBeVisible();
    await expect(page.getByText("En esta versión no subes documentos, no consultamos centrales y no guardamos tu cotización.", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Revisar esta cotización" }).click();

    await expect(page.getByRole("heading", { name: "Todavía no podemos describir bien esta cotización" })).toBeFocused();
    const structuralMissing = page.getByRole("heading", { name: "Falta para describir la estructura" }).locator("..");
    await expect(structuralMissing.getByText("Estructura contractual", { exact: true })).toBeVisible();
    await expect(structuralMissing.getByText("Monto financiado", { exact: true })).toBeVisible();
    await expect(page.getByText("No verificó documentos, no calculó costo total ni ahorro, no eligió ganador", { exact: false })).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
  });

  test("marks a complete peso mortgage quote as materially ready without winner or savings claims", async ({ page }) => {
    await page.goto("/comprar/comparar-cotizaciones");
    await fillCompleteMortgageQuote(page, "Entidad A");
    await page.getByRole("button", { name: "Revisar esta cotización" }).click();

    await expect(page.getByRole("heading", { name: "La cotización ya tiene los datos materiales para la siguiente etapa" })).toBeFocused();
    await expect(page.getByText("70.0%", { exact: true })).toBeVisible();
    await expect(page.getByText("información declarada y no verificada", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Añadir otra cotización" })).toBeVisible();

    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("mejor opción");
    expect(body).not.toContain("más barata");
    expect(body).not.toContain("te ahorrarías");
    expect(body).not.toContain("probabilidad de aprobación");
  });

  test("keeps a UVR quote structurally ready until its quoted reference basis is supplied", async ({ page }) => {
    await page.goto("/comprar/comparar-cotizaciones");

    await page.getByLabel("Crédito hipotecario").check();
    await page.getByRole("radio", { name: /^UVR/ }).check();
    await page.getByLabel("Monto financiado (COP)").fill("300000000");
    await page.getByLabel("Plazo (meses)").fill("180");
    await page.getByLabel("Cuota inicial del crédito (COP/mes)").fill("3000000");
    await page.getByRole("button", { name: "Revisar esta cotización" }).click();

    await expect(page.getByRole("heading", { name: "Ya entendemos la estructura; aún faltan datos materiales" })).toBeFocused();
    await expect(page.getByText("Referencia o índice de la cotización UVR", { exact: true })).toBeVisible();
    await expect(page.getByText("La cotización UVR no declara el índice o referencia de tasa", { exact: false })).toBeVisible();
  });

  test("normalizes two quotes into basis differences without producing a ranking", async ({ page }) => {
    await page.goto("/comprar/comparar-cotizaciones");

    await fillCompleteMortgageQuote(page, "Entidad A");
    await page.getByRole("button", { name: "Revisar esta cotización" }).click();
    await page.getByRole("button", { name: "Añadir otra cotización" }).click();

    await expect(page.getByText("Cotización A conservada en esta pantalla", { exact: true })).toBeVisible();
    await fillCompleteLeasingQuote(page, "Entidad B");
    await page.getByRole("button", { name: "Revisar esta cotización" }).click();

    await expect(page.getByRole("heading", { name: "Ahora sabemos qué no es directamente comparable" })).toBeFocused();
    await expect(page.getByRole("heading", { name: "Estructura contractual" })).toBeVisible();
    await expect(page.getByText("Crédito hipotecario", { exact: true })).toBeVisible();
    await expect(page.getByText("Leasing habitacional", { exact: true })).toBeVisible();
    await expect(page.getByText("Normalizar el monto financiado o el aporte de capital", { exact: false })).toBeVisible();
    await expect(page.getByText("Incorporar la economía de la opción de compra del leasing", { exact: false })).toBeVisible();
    await expect(page.getByText("Todavía no calculamos cuál es más barata, cuál gana, cuánto ahorrarías", { exact: false })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);

    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("ganador:");
    expect(body).not.toContain("recomendamos entidad");
    expect(body).not.toContain("aprobado");
    expect(body).not.toMatch(/\b\d{1,3}%\s*(match|compatib|aprob)/i);
  });
});
