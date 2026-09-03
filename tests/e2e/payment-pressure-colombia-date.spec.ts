import { expect, test, type Page } from "@playwright/test";

async function completeArticle20Triage(page: Page) {
  await page.goto("/ayuda");
  await page.getByLabel("Crédito hipotecario de vivienda", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("Estoy al día", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("Sí", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("Está en riesgo", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("No, solo quiero resolver la presión de pago", { exact: true }).check();
  await page.getByRole("button", { name: "Ver qué hacer ahora" }).click();
}

test("evaluates the Article 20 season on the Colombia calendar date", async ({ page }) => {
  // 2026-03-01 04:30 UTC is still 2026-02-28 in America/Bogota.
  // A browser-local date in UTC would incorrectly move the route to March.
  await page.clock.setFixedTime(new Date("2026-03-01T04:30:00.000Z"));
  await completeArticle20Triage(page);

  await expect(page.getByText("Evaluar reestructuración anual del artículo 20", { exact: true })).toBeVisible();
  await expect(page.getByText("Preparar la próxima ventana del artículo 20", { exact: true })).toHaveCount(0);
});
