import { expect, test } from "@playwright/test";

async function openModeledRadar(page: import("@playwright/test").Page) {
  await page.goto("/verificar");
  await page.getByLabel("Seleccionar extracto local").setInputFiles({
    name: "decision-workspace-local.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 local-reference-only"),
  });

  await page.getByLabel("Fecha de corte del extracto").fill("2026-08-15");
  await page.getByRole("radio", { name: "Crédito hipotecario de vivienda" }).first().check();
  await page.getByRole("radio", { name: "Pesos", exact: true }).first().check();
  await page.getByLabel("Saldo de capital (COP)").fill("180000000");
  await page.getByLabel("Tasa efectiva anual — EA (%)").fill("12");
  await page.getByLabel("Cuotas restantes").fill("204");
  await page.getByRole("radio", { name: "Cuota constante en pesos" }).first().check();
  await page.getByRole("button", { name: "Organizar mi situación" }).click();

  await page.getByLabel("Abono adicional mensual que quieres probar (COP)").fill("200000");
  await page.getByRole("button", { name: "Modelar este abono" }).click();
  await expect(page.getByText("Escenario de prepago · C2", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Ver mi situación y oportunidades" }).click();
  const workspace = page.locator('section[aria-labelledby="opportunity-workspace-title"]');
  await expect(workspace).toBeVisible();
  return workspace;
}

async function chooseHowToProceed(
  workspace: import("@playwright/test").Locator,
  optionName: "Prepararlo por mi cuenta" | "Revisarlo con acompañamiento" | "Preparar revisión profesional",
) {
  const gate = workspace.locator("[data-execution-intent-gate]");
  await expect(gate).toBeVisible();
  await expect(workspace.locator('section[aria-labelledby="case-plan-title"]')).toHaveCount(0);
  await gate.getByRole("button", { name: optionName, exact: true }).click();
  await expect(gate).toHaveCount(0);
}

test.describe("Radar → Mi Decisión → Plan", () => {
  test("requires decision review and an explicit execution choice before opening Case Plan", async ({ page }) => {
    const workspace = await openModeledRadar(page);
    const r1 = workspace.locator('article[data-route-code="R1_PREPAGO_PLAZO"]');

    await expect(r1.getByText(/Precisión C2 solo para esta opción/)).toBeVisible();
    await r1.getByRole("button", { name: "Preparar esta ruta" }).click();

    const decisionWorkspace = workspace.locator('[data-decision-workspace="selected-route"]');
    await expect(decisionWorkspace).toBeVisible();
    await expect(decisionWorkspace.locator('[data-decision-state="selection_recorded_local"]')).toBeVisible();
    await expect(decisionWorkspace.getByRole("heading", { name: "Preferencia registrada en esta vista previa" })).toBeVisible();
    await expect(decisionWorkspace.getByText("C2 · ruta que gobierna", { exact: true })).toBeVisible();

    const actionProfile = decisionWorkspace.locator('[data-decision-action-profile="R1_PREPAGO_PLAZO"]');
    await expect(actionProfile).toBeVisible();
    await expect(actionProfile.getByText("Efecto esperado", { exact: true })).toBeVisible();
    await expect(actionProfile.getByText(/Buscar una reducción del plazo restante/i)).toBeVisible();
    await expect(actionProfile.getByText("Esfuerzo visible del plan", { exact: true })).toBeVisible();
    await expect(actionProfile.getByText(/Autogestión disponible/i)).toBeVisible();
    await expect(actionProfile.getByText(/capital adicional lo aporta el usuario y no es una tarifa/i)).toBeVisible();
    await expect(actionProfile.getByText(/costos externos no modelados/i)).toBeVisible();

    await expect(workspace.getByText("Plan de acción · vista local", { exact: true })).toHaveCount(0);

    await decisionWorkspace.getByRole("button", { name: "Continuar al plan de esta ruta" }).click();
    const gate = workspace.locator("[data-execution-intent-gate]");
    await expect(gate.getByRole("heading", { name: "Elige cómo quieres preparar el siguiente paso." })).toBeVisible();
    await expect(gate.getByRole("button", { name: "Prepararlo por mi cuenta", exact: true })).toBeVisible();
    await expect(gate.getByRole("button", { name: "Revisarlo con acompañamiento", exact: true })).toHaveCount(0);

    await chooseHowToProceed(workspace, "Prepararlo por mi cuenta");

    const plan = workspace.locator('section[aria-labelledby="case-plan-title"]');
    await expect(plan).toBeVisible();
    await expect(plan.getByText("C2 · precisión heredada", { exact: true })).toBeVisible();
    await expect(plan.getByText("Autogestión", { exact: true })).toBeVisible();
    await expect(plan.locator('[data-selected-execution-intent="prepare_self"]')).toBeVisible();

    await workspace.getByRole("button", { name: "Volver a oportunidades" }).click();
    await expect(workspace.getByText("Plan de acción · vista local", { exact: true })).toHaveCount(0);
    await expect(decisionWorkspace).toBeVisible();
  });

  test("lets R10 govern and requires professional-review execution mode", async ({ page }) => {
    const workspace = await openModeledRadar(page);
    await workspace.getByLabel("6. ¿Cuál es el estado de pago/cobranza?").selectOption("executive");

    const r10 = workspace.locator('article[data-route-code="R10_EXECUTIVE_DEFENSE"]');
    const r1 = workspace.locator('article[data-route-code="R1_PREPAGO_PLAZO"]');
    await expect(r10).toBeVisible();
    await expect(r1.getByText(/Precisión C2 solo para esta opción/)).toBeVisible();

    await r1.getByRole("button", { name: "Preparar esta ruta" }).click();

    const decisionWorkspace = workspace.locator('[data-decision-workspace="selected-route"]');
    const decision = decisionWorkspace.locator('[data-decision-state="professional_review_required"]');
    await expect(decision).toBeVisible();
    await expect(decision.getByRole("heading", { name: "Revisión profesional prioritaria" })).toBeVisible();
    await expect(decision.getByText("C1 · ruta que gobierna", { exact: true })).toBeVisible();
    await expect(decision.getByText(/no desplaza la revisión jurídica prioritaria/i)).toBeVisible();

    const r10Profile = decisionWorkspace.locator('[data-decision-action-profile="R10_EXECUTIVE_DEFENSE"]');
    await expect(r10Profile).toBeVisible();
    await expect(r10Profile.getByText(/No es apropiada como autogestión ordinaria/i)).toBeVisible();
    await expect(r10Profile.getByText(/No existe un servicio asistido habilitado para contratar/i)).toBeVisible();
    await expect(r10Profile.getByText(/servicio asistido no habilitado ni cotizado aquí/i)).toBeVisible();

    await decisionWorkspace.getByRole("button", { name: "Preparar revisión prioritaria" }).click();
    const gate = workspace.locator("[data-execution-intent-gate]");
    await expect(gate.getByRole("button", { name: "Preparar revisión profesional", exact: true })).toBeVisible();
    await expect(gate.getByRole("button", { name: "Prepararlo por mi cuenta", exact: true })).toHaveCount(0);
    await expect(gate.getByRole("button", { name: "Revisarlo con acompañamiento", exact: true })).toHaveCount(0);

    await chooseHowToProceed(workspace, "Preparar revisión profesional");

    const plan = workspace.locator('section[aria-labelledby="case-plan-title"]');
    await expect(plan.getByText("C1 · precisión heredada", { exact: true })).toBeVisible();
    await expect(plan.getByText("Revisión profesional", { exact: true }).first()).toBeVisible();
    await expect(plan.locator('[data-selected-execution-intent="professional_review"]')).toBeVisible();
  });

  test("shows R7 assisted audit as an explicit unquoted execution choice", async ({ page }) => {
    const workspace = await openModeledRadar(page);
    await workspace.getByLabel("Sí, quiero priorizar auditoría/reclamación.").check();

    const r7 = workspace.locator('article[data-route-code="R7_RECLAMACION"]');
    await expect(r7).toBeVisible();
    await r7.getByRole("button", { name: "Preparar esta ruta" }).click();

    const decisionWorkspace = workspace.locator('[data-decision-workspace="selected-route"]');
    const r7Profile = decisionWorkspace.locator('[data-decision-action-profile="R7_RECLAMACION"]');
    await expect(r7Profile).toBeVisible();
    await expect(r7Profile.getByText(/Auditoría Hipotecaria: modalidad asistida definida para esta versión de demostración/i)).toBeVisible();
    await expect(r7Profile.getByText(/servicio asistido sin precio final cotizado en esta versión/i)).toBeVisible();
    await expect(r7Profile.getByText(/Esta ruta exige revisión profesional/i)).toBeVisible();
    await expect(r7Profile.getByText(/costos externos no modelados/i)).toBeVisible();
    await expect(r7Profile.getByText(/precio.*COP|\$\s?[0-9]/i)).toHaveCount(0);

    await decisionWorkspace.getByRole("button", { name: "Preparar revisión prioritaria" }).click();
    const gate = workspace.locator("[data-execution-intent-gate]");
    await expect(gate.getByRole("button", { name: "Prepararlo por mi cuenta", exact: true })).toBeVisible();
    await expect(gate.getByRole("button", { name: "Revisarlo con acompañamiento", exact: true })).toBeVisible();
    await expect(gate.getByRole("button", { name: "Preparar revisión profesional", exact: true })).toHaveCount(0);

    await chooseHowToProceed(workspace, "Revisarlo con acompañamiento");

    const plan = workspace.locator('section[aria-labelledby="case-plan-title"]');
    await expect(plan.getByText("Acompañamiento", { exact: true })).toBeVisible();
    await expect(plan.locator('[data-selected-execution-intent="assisted_mortgage_audit"]')).toBeVisible();
  });

  test("requires a new review when a selected modeled route loses C2", async ({ page }) => {
    const workspace = await openModeledRadar(page);
    const r1 = workspace.locator('article[data-route-code="R1_PREPAGO_PLAZO"]');
    await r1.getByRole("button", { name: "Preparar esta ruta" }).click();

    const decisionWorkspace = workspace.locator('[data-decision-workspace="selected-route"]');
    await expect(decisionWorkspace.getByText("C2 · ruta que gobierna", { exact: true })).toBeVisible();
    await expect(decisionWorkspace.getByRole("button", { name: "Continuar al plan de esta ruta" })).toBeVisible();

    await workspace.getByLabel("3. ¿Cuánto capital adicional podrías destinar a prepago?").fill("300000");

    const revalidation = decisionWorkspace.locator('[data-decision-revalidation="review_required"]');
    await expect(revalidation).toBeVisible();
    await expect(revalidation.getByText(/Cambió el nivel de precisión/i)).toBeVisible();
    await expect(decisionWorkspace.getByText("C1 · ruta que gobierna", { exact: true })).toBeVisible();
    await expect(decisionWorkspace.getByRole("button", { name: "Continuar al plan de esta ruta" })).toHaveCount(0);
    await expect(workspace.getByText("Plan de acción · vista local", { exact: true })).toHaveCount(0);

    await revalidation.getByRole("button", { name: "Revisé los cambios · usar fundamento actual" }).click();

    await expect(decisionWorkspace.locator('[data-decision-revalidation="review_required"]')).toHaveCount(0);
    await decisionWorkspace.getByRole("button", { name: "Continuar al plan de esta ruta" }).click();
    await chooseHowToProceed(workspace, "Prepararlo por mi cuenta");
    await expect(workspace.getByText("C1 · precisión heredada", { exact: true })).toBeVisible();
  });

  test("closes an open plan and requires a new execution choice when R10 appears later", async ({ page }) => {
    const workspace = await openModeledRadar(page);
    const r1 = workspace.locator('article[data-route-code="R1_PREPAGO_PLAZO"]');
    await r1.getByRole("button", { name: "Preparar esta ruta" }).click();

    const decisionWorkspace = workspace.locator('[data-decision-workspace="selected-route"]');
    await decisionWorkspace.getByRole("button", { name: "Continuar al plan de esta ruta" }).click();
    await chooseHowToProceed(workspace, "Prepararlo por mi cuenta");
    await expect(workspace.getByText("C2 · precisión heredada", { exact: true })).toBeVisible();

    await workspace.getByLabel("6. ¿Cuál es el estado de pago/cobranza?").selectOption("executive");

    await expect(workspace.getByText("Plan de acción · vista local", { exact: true })).toHaveCount(0);
    await expect(workspace.locator("[data-execution-intent-gate]")).toHaveCount(0);
    const revalidation = decisionWorkspace.locator('[data-decision-revalidation="review_required"]');
    await expect(revalidation).toBeVisible();
    await expect(revalidation.getByText(/Cambió la ruta que debe gobernar/i)).toBeVisible();
    await expect(decisionWorkspace.locator('[data-decision-state="professional_review_required"]')).toBeVisible();
    await expect(decisionWorkspace.getByText("C1 · ruta que gobierna", { exact: true })).toBeVisible();

    await revalidation.getByRole("button", { name: "Revisé los cambios · usar fundamento actual" }).click();

    await decisionWorkspace.getByRole("button", { name: "Preparar revisión prioritaria" }).click();
    const gate = workspace.locator("[data-execution-intent-gate]");
    await expect(gate.getByRole("button", { name: "Preparar revisión profesional", exact: true })).toBeVisible();
    await chooseHowToProceed(workspace, "Preparar revisión profesional");
    await expect(workspace.getByText("C1 · precisión heredada", { exact: true })).toBeVisible();
    await expect(workspace.locator('[data-selected-execution-intent="professional_review"]')).toBeVisible();
  });
});
