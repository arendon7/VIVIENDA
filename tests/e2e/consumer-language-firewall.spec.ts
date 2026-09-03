import { expect, test } from "@playwright/test";

const primaryRoutes = [
  "/",
  "/revisar",
  "/verificar",
  "/mi-vivienda",
  "/ayuda",
  "/revisar-diferencia",
  "/comprar/cuanto-puedo-comprar",
  "/comprar/preparacion",
  "/comprar/financiacion",
  "/comprar/comparar-cotizaciones",
  "/auditoria-hipotecaria",
] as const;

const forbiddenVisibleTerms = [
  "Mortgage Twin",
  "Loan Health",
  "Opportunity Router",
  "Case Plan",
  "Case Timeline",
  "Event log",
  "self-service",
  "Preview",
  "score bancario",
  "Referencia mínima de equity",
  "Track",
  "Assisted",
] as const;

test.describe("Casa con Criterio consumer-language firewall", () => {
  for (const route of primaryRoutes) {
    test(`${route} keeps engineering vocabulary out of normal customer copy`, async ({ page }) => {
      await page.goto(route);
      const visibleText = await page.locator("body").innerText();

      for (const term of forbiddenVisibleTerms) {
        expect(visibleText, `${route} should not expose ${term}`).not.toContain(term);
      }
    });
  }

  test("the masterbrand is visible without reviving the former product placeholder name", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByLabel("Casa con Criterio · inicio")).toBeVisible();
    const visibleText = await page.locator("body").innerText();
    expect(visibleText).not.toMatch(/(^|\s)VIVIENDA(\s|$)/);
  });
});
