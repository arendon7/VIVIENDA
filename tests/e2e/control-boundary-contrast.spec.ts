import { expect, test } from "@playwright/test";

test("keeps primary field boundaries on the accessible control-border token", async ({ page }) => {
  await page.goto("/revisar");

  await page.getByRole("radio", { name: "Crédito hipotecario" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: "Pesos", exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  const balanceInput = page.getByLabel("¿Cuánto capital debes aproximadamente?");
  await expect(balanceInput).toBeVisible();
  await expect(balanceInput).toHaveCSS("border-top-color", "rgb(133, 142, 147)");
});
