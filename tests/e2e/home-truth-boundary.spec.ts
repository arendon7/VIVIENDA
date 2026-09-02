import { expect, test } from "@playwright/test";

test("keeps assisted execution explicitly preview-only on Home", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Acompañamiento · preview", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "La ruta asistida aparece solo cuando realmente aporta." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Esta Beta todavía no activa contratación ni ejecución asistida. Antes de cualquier gestión habría que confirmar los datos del crédito y separar lo que depende de terceros.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText("Podemos ayudarte a verificar y ejecutar la decisión.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Mejorar precisión" })).toHaveAttribute("href", "/revisar");
});

test("keeps muted navigation text on the AA-compliant color token", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".nav-link").first()).toHaveCSS("color", "rgb(101, 112, 120)");
});
