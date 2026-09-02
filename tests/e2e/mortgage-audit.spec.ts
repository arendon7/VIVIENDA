import { expect, test } from "@playwright/test";

test.describe("Mortgage Audit assisted preview v0.12", () => {
  test("shows the R7 service boundary without fabricating representation or filing", async ({ page }) => {
    await page.goto("/auditoria-hipotecaria");

    await expect(page.getByRole("heading", { name: "Entiende una diferencia concreta antes de escalar." })).toBeVisible();
    await expect(page.getByText("Preview de servicio asistido · no contratado")).toBeVisible();
    await expect(page.getByText(/Esta preview muestra cómo se organizaría la evidencia/)).toBeVisible();
    await expect(page.getByText(/Organizamos la evidencia, verificamos qué ocurrió y hacemos una revisión profesional/)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Una auditoría real tendría que avanzar por evidencia, no por promesas." })).toBeVisible();
    await expect(page.getByText("Resultado profesional previsto", { exact: true })).toBeVisible();
    await expect(page.getByText("R7 · Auditoría / posible reclamación")).toBeVisible();
    await expect(page.getByText("No concedida")).toBeVisible();
    await expect(page.getByText("No concedido")).toBeVisible();

    await expect(page.getByText("explained", { exact: true })).toBeVisible();
    await expect(page.getByText("needs_more_evidence", { exact: true })).toBeVisible();
    await expect(page.getByText("possible_inconsistency", { exact: true })).toBeVisible();
    await expect(page.getByText("route_change_required", { exact: true })).toBeVisible();
    await expect(page.getByText("illegal", { exact: true })).toHaveCount(0);

    await expect(page.getByText("SERVICE_AGREEMENT_ACCEPTED", { exact: true })).toBeVisible();
    await expect(page.getByText("PROFESSIONAL_REVIEW_COMPLETED", { exact: true })).toBeVisible();
    await expect(page.getByText("SUBMISSION_RECORDED", { exact: true })).toHaveCount(0);

    await expect(page.getByRole("link", { name: "Ver qué evidencia preparar" }).first()).toHaveAttribute("href", "#evidence-heading");
    const statementGuideLink = page.locator('nav[aria-label="Auditoría Hipotecaria"] a[href="/verificar"]');
    await expect(statementGuideLink).toHaveText("Extracto como guía");
    await expect(page.getByRole("link", { name: "Preparar mi evidencia" })).toHaveCount(0);
  });

  test("preserves the no-power and no-guarantee disclosure", async ({ page }) => {
    await page.goto("/auditoria-hipotecaria");

    await expect(page.getByRole("heading", { name: "Aceptar una auditoría no equivale a contratar representación." })).toBeVisible();
    await expect(page.getByText("No concede facultad extrajudicial.")).toBeVisible();
    await expect(page.getByText("No concede poder judicial.")).toBeVisible();
    await expect(page.getByText("No registra una reclamación como radicada.")).toBeVisible();
    await expect(page.getByText("No garantiza ahorro, corrección o resultado.")).toBeVisible();
  });

  test("is keyboard reachable and has no horizontal overflow", async ({ page }) => {
    await page.goto("/auditoria-hipotecaria");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
});