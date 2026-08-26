import { expect, test } from "@playwright/test";

async function openOpportunityWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/verificar");
  await page.getByLabel("Selecciona un extracto para probar la experiencia").setInputFiles({
    name: "extracto-demo.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 demo"),
  });

  const confirmationBoxes = page.locator('input[type="checkbox"]:not(:disabled)');
  await expect(confirmationBoxes).toHaveCount(6);
  for (let index = 0; index < 6; index += 1) {
    await confirmationBoxes.nth(index).check();
  }

  await page.getByRole("button", { name: "Previsualizar Mortgage Twin" }).click();
  await expect(page.getByRole("heading", { name: "Convierte el Mortgage Twin en próximas decisiones posibles." })).toBeVisible();
  return page.locator('section[aria-labelledby="opportunity-workspace-title"]');
}

async function openTermPrepaymentTimeline(page: import("@playwright/test").Page) {
  const workspace = await openOpportunityWorkspace(page);
  await workspace.getByRole("radio", { name: "Crédito hipotecario de vivienda" }).check();
  await workspace.getByRole("radio", { name: "Terminar antes" }).check();
  await workspace.getByLabel("3. ¿Cuánto capital adicional podrías aportar?").fill("300000");

  const primary = workspace.getByRole("article", {
    name: /Ruta prioritaria: Usar abonos adicionales para reducir plazo/,
  });
  await primary.getByRole("button", { name: "Preparar esta ruta" }).click();

  const plan = workspace.locator('section[aria-labelledby="case-plan-title"]');
  await plan.getByRole("button", { name: "Ver expediente local de demostración" }).click();

  const timeline = plan.locator('section[aria-labelledby="case-timeline-title"]');
  await expect(timeline.getByRole("heading", { name: /Así se reconstruiría el expediente a partir de hechos/ })).toBeVisible();
  return timeline;
}

function capabilityRow(timeline: import("@playwright/test").Locator, label: string) {
  const capabilities = timeline.getByLabel("Capacidades separadas del expediente");
  return capabilities.getByText(label, { exact: true }).locator("..");
}

test("starts the local Case Log at version one without claiming persistence or execution", async ({ page }) => {
  const timeline = await openTermPrepaymentTimeline(page);

  await expect(timeline.getByText("Versión 1", { exact: true })).toBeVisible();
  await expect(timeline.getByText("Borrador", { exact: true })).toBeVisible();
  await expect(timeline.getByText("SIMULADO", { exact: true })).toBeVisible();
  await expect(timeline.getByText("R1_PREPAGO_PLAZO", { exact: true })).toBeVisible();
  await expect(timeline.getByText("eligible_now", { exact: true })).toBeVisible();
  await expect(timeline.getByText("C2", { exact: true })).toBeVisible();
  await expect(timeline.getByText("self_service", { exact: true })).toBeVisible();
  await expect(timeline.getByText(/no crean un expediente productivo/i)).toBeVisible();

  const log = timeline.getByLabel("Timeline local del expediente");
  await expect(log.getByRole("article", { name: /Evento 1: Expediente local creado/ })).toBeVisible();
  await expect(timeline.getByRole("button", { name: /radicar|enviar al banco|registrar respuesta/i })).toHaveCount(0);
});

test("data authorization increments the log but grants neither service nor legal authority", async ({ page }) => {
  const timeline = await openTermPrepaymentTimeline(page);

  await timeline.getByRole("button", { name: "Simular autorización de datos" }).click();

  await expect(timeline.getByText("Versión 2", { exact: true })).toBeVisible();
  await expect(capabilityRow(timeline, "Autorización de datos").getByText("Sí", { exact: true })).toBeVisible();
  await expect(capabilityRow(timeline, "Servicio aceptado").getByText("No", { exact: true })).toBeVisible();
  await expect(capabilityRow(timeline, "Facultad extrajudicial").getByText("No", { exact: true })).toBeVisible();
  await expect(capabilityRow(timeline, "Poder judicial").getByText("No", { exact: true })).toBeVisible();

  const log = timeline.getByLabel("Timeline local del expediente");
  await expect(log.getByRole("article", { name: /Evento 2: Autorización de datos registrada/ })).toBeVisible();
});

test("attaching evidence derives collecting-evidence state without inventing verification", async ({ page }) => {
  const timeline = await openTermPrepaymentTimeline(page);

  await timeline.getByRole("button", { name: "Simular autorización de datos" }).click();
  await timeline.getByRole("button", { name: "Simular carga de extracto" }).click();

  await expect(timeline.getByText("Versión 3", { exact: true })).toBeVisible();
  await expect(timeline.getByText("Recopilando evidencia", { exact: true })).toBeVisible();

  const log = timeline.getByLabel("Timeline local del expediente");
  const evidenceEvent = log.getByRole("article", { name: /Evento 3: Evidencia adjunta/ });
  await expect(evidenceEvent).toBeVisible();
  await expect(evidenceEvent.getByText("EVIDENCE_ATTACHED", { exact: true })).toBeVisible();
  await expect(timeline.getByText("Evidencia verificada", { exact: true })).toHaveCount(0);
});

test("a legal route can request professional review but cannot auto-complete lawyer work", async ({ page }) => {
  const workspace = await openOpportunityWorkspace(page);
  await workspace.getByRole("radio", { name: "Crédito hipotecario de vivienda" }).check();
  await workspace.getByLabel("6. ¿Cuál es el estado de pago/cobranza?").selectOption("embargo_or_auction");

  const primary = workspace.getByRole("article", {
    name: /Ruta prioritaria: Revisión jurídica prioritaria del proceso/,
  });
  await primary.getByRole("button", { name: "Preparar esta ruta" }).click();

  const plan = workspace.locator('section[aria-labelledby="case-plan-title"]');
  await plan.getByRole("button", { name: "Ver expediente local de demostración" }).click();
  const timeline = plan.locator('section[aria-labelledby="case-timeline-title"]');

  await expect(timeline.getByText("legal", { exact: true })).toBeVisible();
  await expect(capabilityRow(timeline, "Revisión profesional").getByText("No", { exact: true })).toBeVisible();

  await timeline.getByRole("button", { name: "Simular solicitud de revisión" }).click();

  await expect(timeline.getByText("Versión 2", { exact: true })).toBeVisible();
  await expect(timeline.getByText("En revisión", { exact: true })).toBeVisible();
  await expect(timeline.getByText(/no ofrecemos un botón para marcarla automáticamente como completada/i)).toBeVisible();
  await expect(timeline.getByText(/exige actor lawyer/i)).toBeVisible();
  await expect(timeline.getByRole("button", { name: /completar revisión|revisión completada/i })).toHaveCount(0);
  await expect(capabilityRow(timeline, "Revisión profesional").getByText("No", { exact: true })).toBeVisible();

  const log = timeline.getByLabel("Timeline local del expediente");
  await expect(log.getByRole("article", { name: /Evento 2: Revisión profesional solicitada/ })).toBeVisible();
});
