import { expect, test } from "@playwright/test";

test("Home exposes payment-pressure help without replacing the primary borrower action", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Revisar mi crédito" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /¿Te está costando pagar o ya te están cobrando/ })).toHaveAttribute("href", "/ayuda");
});