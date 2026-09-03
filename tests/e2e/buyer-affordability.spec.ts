import { expect, test } from "@playwright/test";

test.describe("Buyer affordability v0.13", () => {
  test("delivers C1 before identity and progresses to a user-supplied C2 model", async ({ page }) => {
    await page.goto("/comprar/cuanto-puedo-comprar");

    await expect(page.getByRole("heading", { name: "¿Qué rango de vivienda tiene sentido planear?" })).toBeVisible();
    await expect(page.getByText("No pedimos nombre, cédula, correo, teléfono ni consulta a centrales")).toBeVisible();

    await page.getByLabel("Ingreso neto mensual del hogar").fill("10000000");
    await page.getByLabel("Cuotas mensuales de otras deudas").fill("1000000");
    await page.getByLabel("Cuota inicial disponible").fill("100000000");
    await page.getByLabel("No VIS").check();
    await page.getByRole("button", { name: "Calcular mi rango" }).click();

    await expect(page.getByRole("heading", { name: "Tu primer rango de planificación" })).toBeFocused();
    await expect(page.getByText("Cuota mensual para planear")).toBeVisible();
    await expect(page.getByText(/2\.000\.000/).first()).toBeVisible();
    await expect(page.getByText("30% para planear no es lo mismo que 40% regulatorio.")).toBeVisible();
    await expect(page.getByText("Principal modelado")).toHaveCount(0);

    await page.getByRole("button", { name: "Modelar con tasa y plazo" }).click();
    await page.getByLabel("Tasa efectiva anual del escenario (%)").fill("11.7");
    await page.getByLabel("Plazo del escenario (años)").fill("20");
    await page.getByLabel("Otros costos mensuales de vivienda (opcional)").fill("300000");
    await page.getByRole("button", { name: "Ver escenario modelado" }).click();

    await expect(page.getByRole("heading", { name: "Con estas suposiciones, este es tu rango modelado." })).toBeFocused();
    await expect(page.getByText("Techo del escenario modelado")).toBeVisible();
    await expect(page.getByText(/263\.448\.623/).first()).toBeVisible();
    await expect(page.getByText("Hoy te limita más la capacidad mensual del escenario.").first()).toBeVisible();
    await expect(page.getByText("Crédito + efectivo")).toBeVisible();

    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("aprobado");
    expect(body).not.toContain("te prestan hasta");
    expect(body).not.toMatch(/\d+\s*%\s+de\s+probabilidad/);
    expect(body).not.toContain("tu score es");
  });

  test("keeps VIS and non-VIS separate when category is unknown", async ({ page }) => {
    await page.goto("/comprar/cuanto-puedo-comprar");
    await page.getByLabel("Ingreso neto mensual del hogar").fill("12000000");
    await page.getByLabel("Cuotas mensuales de otras deudas").fill("1000000");
    await page.getByLabel("Cuota inicial disponible").fill("80000000");
    await page.getByLabel("No estoy seguro").check();
    await page.getByRole("button", { name: "Calcular mi rango" }).click();

    await expect(page.getByText("No VIS", { exact: true })).toBeVisible();
    await expect(page.getByText("VIS", { exact: true })).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(2);
  });

  test("shows a valid zero-room result when existing debt exhausts the planning benchmark", async ({ page }) => {
    await page.goto("/comprar/cuanto-puedo-comprar");
    await page.getByLabel("Ingreso neto mensual del hogar").fill("10000000");
    await page.getByLabel("Cuotas mensuales de otras deudas").fill("4000000");
    await page.getByLabel("Cuota inicial disponible").fill("100000000");
    await page.getByRole("button", { name: "Calcular mi rango" }).click();

    await expect(page.getByText("Con el benchmark de planificación actual no queda espacio mensual para una nueva cuota de vivienda.")).toBeVisible();
    await expect(page.getByText(/\$\s*0/).first()).toBeVisible();
  });

  test("is keyboard reachable and has no horizontal overflow", async ({ page }) => {
    await page.goto("/comprar/cuanto-puedo-comprar");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test("Home exposes buyer path without replacing borrower primary CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Revisar mi crédito" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Calcular cuánto puedo planear" })).toHaveAttribute("href", "/comprar/cuanto-puedo-comprar");
  });
});