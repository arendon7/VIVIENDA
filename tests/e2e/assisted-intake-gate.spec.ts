import { expect, test } from "@playwright/test";

async function openR7Plan(
  page: import("@playwright/test").Page,
  executionChoice: "Revisarlo con acompañamiento" | "Prepararlo por mi cuenta",
) {
  await page.goto("/verificar");
  await page.getByLabel("Seleccionar extracto local").setInputFiles({
    name: "intake-gate-local.pdf",
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

  const executionGate = workspace.locator("[data-execution-intent-gate]");
  await executionGate.getByRole("button", { name: executionChoice, exact: true }).click();

  const plan = workspace.locator('section[aria-labelledby="case-plan-title"]');
  await expect(plan).toBeVisible();
  return plan;
}

test.describe("R7 assisted intake activation gate", () => {
  test("moves from local preparation to platform activation required without exposing a fake upload", async ({ page }) => {
    const plan = await openR7Plan(page, "Revisarlo con acompañamiento");
    const inventory = plan.locator('[data-assisted-evidence-readiness="R7_RECLAMACION"]');
    const gate = plan.locator("[data-assisted-intake-gate]");

    await expect(gate).toBeVisible();
    await expect(gate).toHaveAttribute("data-assisted-intake-gate", "local_preparation_required");
    await expect(gate).toHaveAttribute("data-secure-upload-may-be-offered", "false");
    await expect(gate.getByRole("heading", { name: "Qué tendría que estar habilitado antes de recibir tus documentos." })).toBeVisible();
    await expect(gate.locator('input[type="file"]')).toHaveCount(0);
    await expect(gate.getByRole("button", { name: /subir|cargar|enviar documento/i })).toHaveCount(0);

    const currentItems = inventory.locator('[data-evidence-kind="known_required"], [data-evidence-kind="recommended"]');
    const currentCount = await currentItems.count();
    expect(currentCount).toBeGreaterThan(0);

    for (let index = 0; index < currentCount; index += 1) {
      await currentItems.nth(index).getByRole("button", { name: "Lo tengo", exact: true }).click();
    }

    await expect(inventory).toHaveAttribute("data-evidence-preparation-state", "declared_ready_for_future_intake");
    await expect(gate).toHaveAttribute("data-assisted-intake-gate", "platform_activation_required");
    await expect(gate).toHaveAttribute("data-secure-upload-may-be-offered", "false");
    await expect(gate.getByText("La carga segura todavía no está habilitada en este entorno.", { exact: true })).toBeVisible();
    await expect(gate.getByText(/no mostramos un botón que aparentaría recibir documentos/i)).toBeVisible();
    await expect(gate.locator('input[type="file"]')).toHaveCount(0);
  });

  test("does not expose the assisted intake gate in the R7 self-service path", async ({ page }) => {
    const plan = await openR7Plan(page, "Prepararlo por mi cuenta");

    await expect(plan.locator("[data-assisted-intake-gate]")).toHaveCount(0);
    await expect(plan.locator("[data-assisted-evidence-readiness]")).toHaveCount(0);
  });
});
