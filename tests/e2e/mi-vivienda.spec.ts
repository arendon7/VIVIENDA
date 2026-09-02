import { expect, test } from "@playwright/test";

test.describe("Mi Vivienda + estado de decisión product integration", () => {
  test("keeps preview, precision and decision-state boundaries explicit", async ({ page }) => {
    await page.goto("/mi-vivienda");

    await expect(page.getByRole("heading", { name: "Tu crédito, tus decisiones y lo que falta verificar." })).toBeVisible();
    await expect(page.getByText("Vista previa del producto · sin cuenta ni información guardada")).toBeVisible();
    await expect(page.getByText("C2 · Simulación modelada").first()).toBeVisible();
    await expect(page.getByText("Mi Situación · estado de decisión")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Existe al menos una acción concreta que puedes comparar con los datos actuales." })).toBeVisible();
    await expect(page.getByText("No es una calificación crediticia ni de riesgo.", { exact: false })).toBeVisible();
    await expect(page.getByText("Loan Health · estado de decisión", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Preview de producto · sin cuenta ni persistencia activa", { exact: true })).toHaveCount(0);

    await expect(page.getByText("76/100")).toHaveCount(0);
    await expect(page.getByText("89%")).toHaveCount(0);

    await expect(page.getByRole("link", { name: "Simular prepago" })).toHaveAttribute("href", "/revisar");
    await expect(page.getByRole("link", { name: "Revisar mi crédito" })).toHaveAttribute("href", "/revisar");
  });

  test("is keyboard reachable and has no horizontal overflow", async ({ page }) => {
    await page.goto("/mi-vivienda");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test("Home keeps the borrower task primary while exposing Mi Vivienda preview", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Revisar mi crédito" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver Mi Vivienda · vista previa" })).toHaveAttribute("href", "/mi-vivienda");
    await expect(page.getByRole("link", { name: "Ver Mi Vivienda · preview" })).toHaveCount(0);
  });
});
