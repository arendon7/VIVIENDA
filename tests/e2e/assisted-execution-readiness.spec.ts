import { expect, test } from "@playwright/test";

async function openR7AssistedPlan(page: import("@playwright/test").Page) {
  await page.goto("/verificar");
  await page.getByLabel("Seleccionar extracto local").setInputFiles({
    name: "assisted-readiness-local.pdf",
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
  await expect(gate.getByRole("button", { name: "Revisarlo con acompañamiento", exact: true })).toBeVisible();
  await gate.getByRole("button", { name: "Revisarlo con acompañamiento", exact: true }).click();

  const plan = workspace.locator('section[aria-labelledby="case-plan-title"]');
  await expect(plan).toBeVisible();
  return plan;
}

async function openR7SelfPreparedPlan(page: import("@playwright/test").Page) {
  await page.goto("/verificar");
  await page.getByLabel("Seleccionar extracto local").setInputFiles({
    name: "self-readiness-local.pdf",
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
  await expect(gate.getByRole("button", { name: "Prepararlo por mi cuenta", exact: true })).toBeVisible();
  await gate.getByRole("button", { name: "Prepararlo por mi cuenta", exact: true }).click();

  const plan = workspace.locator('section[aria-labelledby="case-plan-title"]');
  await expect(plan).toBeVisible();
  return plan;
}

test.describe("R7 assisted execution readiness", () => {
  test("shows the real setup order while keeping every operational capability pending", async ({ page }) => {
    const plan = await openR7AssistedPlan(page);
    const readiness = plan.locator('[data-assisted-execution-readiness="R7_RECLAMACION"]');

    await expect(readiness).toBeVisible();
    await expect(
      readiness.getByRole("heading", { name: "Qué tendría que ocurrir para iniciar este acompañamiento de verdad." }),
    ).toBeVisible();
    await expect(readiness.getByText("Preparación pendiente", { exact: true })).toBeVisible();
    await expect(readiness.getByText("Ningún paso operativo ha ocurrido todavía.", { exact: true })).toBeVisible();

    const realState = readiness.getByLabel("Estado real del acompañamiento");
    await expect(realState.getByText("No", { exact: true })).toHaveCount(4);

    const steps = readiness.getByLabel("Pasos para preparar el acompañamiento");
    await expect(steps.getByRole("article")).toHaveCount(8);
    await expect(steps.getByRole("article", { name: /Paso 1: Abrir el expediente de acompañamiento/ })).toBeVisible();
    await expect(steps.getByRole("article", { name: /Paso 2: Registrar autorización de datos/ })).toBeVisible();
    await expect(steps.getByRole("article", { name: /Paso 3: Aceptar el alcance del servicio/ })).toBeVisible();
    await expect(steps.getByRole("article", { name: /Paso 6: Verificar la evidencia/ })).toBeVisible();
    await expect(steps.getByRole("article", { name: /Paso 8: Completar la revisión profesional/ })).toBeVisible();

    await expect(readiness.getByText(/no existe un expediente real, contrato, cobro ni actuación externa/i)).toBeVisible();
    await expect(readiness.getByRole("button", { name: /aceptar|contratar|subir|abrir expediente|continuar con pago/i })).toHaveCount(0);
  });

  test("does not leak domain identifiers into visible customer copy", async ({ page }) => {
    const plan = await openR7AssistedPlan(page);
    const readiness = plan.locator('[data-assisted-execution-readiness="R7_RECLAMACION"]');

    await expect(readiness.getByText("CASE_CREATED", { exact: true })).toHaveCount(0);
    await expect(readiness.getByText("assisted", { exact: true })).toHaveCount(0);
    await expect(readiness.getByText("MORTGAGE_AUDIT_R7_V1", { exact: true })).toHaveCount(0);
    await expect(readiness.getByText("PROFESSIONAL_REVIEW_COMPLETED", { exact: true })).toHaveCount(0);
  });

  test("keeps readiness exclusive to the assisted choice", async ({ page }) => {
    const plan = await openR7SelfPreparedPlan(page);
    await expect(plan.getByText("Autogestión", { exact: true })).toBeVisible();
    await expect(plan.locator("[data-assisted-execution-readiness]")).toHaveCount(0);
  });
});
