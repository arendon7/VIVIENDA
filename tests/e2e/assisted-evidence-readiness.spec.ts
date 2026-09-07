import { expect, test } from "@playwright/test";

async function openR7Plan(
  page: import("@playwright/test").Page,
  executionChoice: "Revisarlo con acompañamiento" | "Prepararlo por mi cuenta",
) {
  await page.goto("/verificar");
  await page.getByLabel("Seleccionar extracto local").setInputFiles({
    name: "evidence-inventory-local.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 local-reference-only"),
  });
  await page.getByLabel("Fecha de corte del extracto").fill("2026-08-15");
  await page.getByRole("radio", { name: "Crédito hipotecario de vivienda" }).first().check();
  await page.getByRole("radio", { name: "Pesos", exact: true }).first().check();
  await page.getByLabel("Saldo de capital (COP)").fill("180000000");
  await page.getByRole("button", { name: "Organizar mi situación" }).click();
  await page.getByRole("button", { name: "Ver mi situación y oportunidades" }).click();

  const workspace = page.locator('section[aria-labelledby="opportunity-workspace-title"]');
  await workspace.getByLabel("Sí, quiero priorizar auditoría/reclamación.").check();
  const r7 = workspace.locator('article[data-route-code="R7_RECLAMACION"]');
  await expect(r7).toBeVisible();
  await r7.getByRole("button", { name: "Preparar esta ruta" }).click();

  const decision = workspace.locator('[data-decision-workspace="selected-route"]');
  await decision.getByRole("button", { name: "Preparar revisión prioritaria" }).click();

  const gate = workspace.locator("[data-execution-intent-gate]");
  await gate.getByRole("button", { name: executionChoice, exact: true }).click();

  const plan = workspace.locator('section[aria-labelledby="case-plan-title"]');
  await expect(plan).toBeVisible();
  return plan;
}

test.describe("R7 local evidence readiness", () => {
  test("lets the user inventory supports locally without turning declarations into document intake", async ({ page }) => {
    const plan = await openR7Plan(page, "Revisarlo con acompañamiento");
    const inventory = plan.locator('[data-assisted-evidence-readiness="R7_RECLAMACION"]');

    await expect(inventory).toBeVisible();
    await expect(inventory).toHaveAttribute("data-evidence-inventory-status", "not_started");
    await expect(inventory).toHaveAttribute("data-evidence-preparation-state", "needs_classification");
    await expect(inventory.getByRole("heading", { name: "Prepara tus soportes sin cargarlos todavía." })).toBeVisible();
    await expect(inventory.getByText(/no envía archivos, no guarda documentos y no verifica su contenido/i)).toBeVisible();
    await expect(inventory.locator('input[type="file"]')).toHaveCount(0);
    await expect(inventory.getByRole("button", { name: /subir|cargar|enviar documento/i })).toHaveCount(0);

    const currentItems = inventory.locator('[data-evidence-kind="known_required"], [data-evidence-kind="recommended"]');
    const currentCount = await currentItems.count();
    expect(currentCount).toBeGreaterThan(0);

    for (let index = 0; index < currentCount; index += 1) {
      await currentItems.nth(index).getByRole("button", { name: "Lo tengo", exact: true }).click();
    }

    await expect(inventory).toHaveAttribute("data-evidence-preparation-state", "declared_ready_for_future_intake");
    await expect(inventory.getByText(/Un futuro ingreso documental todavía deberá autorizar, cargar y verificar/i)).toBeVisible();

    await currentItems.first().getByRole("button", { name: "Me falta", exact: true }).click();
    await expect(inventory).toHaveAttribute("data-evidence-preparation-state", "needs_collection");
    await expect(inventory.getByText(/Reúne el 1 soporte/i)).toBeVisible();

    await currentItems.first().getByRole("button", { name: "Lo tengo", exact: true }).click();
    await expect(inventory).toHaveAttribute("data-evidence-preparation-state", "declared_ready_for_future_intake");

    await inventory.getByRole("button", { name: "Reiniciar inventario local" }).click();
    await expect(inventory).toHaveAttribute("data-evidence-inventory-status", "not_started");
    await expect(inventory.locator('[data-evidence-declaration="user_reports_available"]')).toHaveCount(0);
    await expect(inventory.getByText("user_reports_available", { exact: true })).toHaveCount(0);
  });

  test("keeps the assisted evidence inventory out of the R7 self-service path", async ({ page }) => {
    const plan = await openR7Plan(page, "Prepararlo por mi cuenta");

    await expect(plan.locator("[data-assisted-evidence-readiness]")).toHaveCount(0);
    await expect(plan.getByRole("heading", { name: "Qué conviene tener a mano" })).toBeVisible();
  });
});