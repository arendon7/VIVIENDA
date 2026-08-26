import { expect, test } from "@playwright/test";

async function completeQuickCheck(page: import("@playwright/test").Page) {
  await page.goto("/revisar");

  await page.getByRole("radio", { name: "Crédito hipotecario" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("radio", { name: "Pesos", exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("¿Cuánto capital debes aproximadamente?").fill("180000000");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("¿Cuánto pagas aproximadamente cada mes?").fill("2100000");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("¿Cuántos años te faltan aproximadamente?").fill("17");
  await page.getByRole("button", { name: "Ver mi primera lectura" }).click();
}

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

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");

  const focusedRole = await page.evaluate(() => document.activeElement?.getAttribute("type"));
  expect(["radio", null]).toContain(focusedRole);

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
