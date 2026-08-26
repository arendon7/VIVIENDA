import { expect, test } from "@playwright/test";

test.describe("Mi Vivienda product integration preview", () => {
  test("keeps preview, precision and action boundaries explicit", async ({ page }) => {
    await page.goto("/mi-vivienda");

    await expect(page.getByRole("heading", { name: "Tu crédito, tus decisiones y lo que falta verificar." })).toBeVisible();
    await expect(page.getByText("Preview de producto · sin cuenta ni persistencia activa")).toBeVisible();
    await expect(page.getByText("C2 · Simulación modelada").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Acciones, no un score decorativo." })).toBeVisible();
    await expect(page.getByText("Sin CTA hasta tener datos externos verificables")).toBeVisible();

    await expect(page.getByText("76/100")).toHaveCount(0);
    await expect(page.getByText("89%")).toHaveCount(0);

    await expect(page.getByRole("link", { name: "Verificar mi crédito" })).toHaveAttribute("href", "/verificar");
    await expect(page.getByRole("link", { name: "Revisar mi crédito" })).toHaveAttribute("href", "/revisar");
  });

  test("is keyboard reachable and has no horizontal overflow", async ({ page }) => {
    await page.goto("/mi-vivienda");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test("Home exposes the preview without replacing the primary borrower CTA", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Revisar mi crédito" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver Mi Vivienda · preview" })).toHaveAttribute("href", "/mi-vivienda");
  });
});
