import { expect, test } from "@playwright/test";

test("home primary navigation points only to implemented customer routes", async ({ page }) => {
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "Principal" });

  await expect(navigation.getByRole("link", { name: "Radar Vivienda" })).toHaveAttribute("href", "#radar");
  await expect(navigation.getByRole("link", { name: "Mi Vivienda" })).toHaveAttribute("href", "/mi-vivienda");
  await expect(navigation.getByRole("link", { name: "Comparar" })).toHaveAttribute(
    "href",
    "/comprar/comparar-cotizaciones",
  );
  await expect(navigation.getByRole("link", { name: "Comprar" })).toHaveAttribute(
    "href",
    "/comprar/cuanto-puedo-comprar",
  );
  await expect(navigation.getByRole("link", { name: "Resolver" })).toHaveAttribute("href", "/ayuda");

  await expect(page.locator('a[href="/comparar-ofertas"]')).toHaveCount(0);
});

test("keeps the home navigation available on a compact mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "Principal" });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Mi Vivienda" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Comparar" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Comprar" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Resolver" })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
