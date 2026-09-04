import { expect, test } from "@playwright/test";

async function openOpportunityWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/verificar");
  await page.getByLabel("Seleccionar extracto local").setInputFiles({
    name: "extracto-local.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 local-reference"),
  });

  await page.getByLabel("Fecha de corte del extracto").fill("2026-08-15");
  await page.getByRole("radio", { name: "Crédito hipotecario de vivienda" }).first().check();
  await page.getByRole("radio", { name: "Pesos", exact: true }).first().check();
  await page.getByLabel("Saldo de capital (COP)").fill("180000000");
  await page.getByRole("button", { name: "Organizar mi situación" }).click();
  await page.getByRole("button", { name: "Ver mi situación y oportunidades" }).click();

  await expect(page.getByRole("heading", { name: "Entiende tu situación, descubre qué merece atención y compara las opciones que ya tienen suficiente información." })).toBeVisible();
  const workspace = page.locator('section[aria-labelledby="opportunity-workspace-title"]');
  await expect(workspace.getByRole("radio", { name: "Crédito hipotecario de vivienda" })).toBeChecked();
  return workspace;
}

async function openTermPrepaymentTimeline(page: import("@playwright/test").Page) {
  const workspace = await openOpportunityWorkspace(page);
  await workspace.getByRole("radio", { name: "Terminar antes" }).check();
  await workspace.getByLabel("3. ¿Cuánto capital adicional podrías destinar a prepago?").fill("300000");

  const primary = workspace.getByRole("article", {
    name: /Ruta prioritaria: Usar abonos adicionales para reducir plazo/,
  });
  await primary.getByRole("button", { name: "Preparar esta ruta" }).click();

  const plan = workspace.locator('section[aria-labelledby="case-plan-title"]');
  await plan.getByRole("button", { name: "Ver expediente local de demostración" }).click();

  const timeline = plan.locator('section[aria-labelledby="case-timeline-title"]');
  await expect(timeline.getByRole("heading", { name: /Así se reconstruiría el expediente a partir de hechos registrados/ })).toBeVisible();
  return timeline;
}

function capabilityRow(timeline: import("@playwright/test").Locator, label: string) {
  const capabilities = timeline.getByLabel("Capacidades separadas del expediente");
  return capabilities.getByText(label, { exact: true }).locator("..");
}

test("starts the local case history at version one without claiming persistence or execution", async ({ page }) => {
  const timeline = await openTermPrepaymentTimeline(page);

  await expect(timeline.getByText("Versión 1", { exact: true })).toBeVisible();
  await expect(timeline.getByText("Borrador", { exact: true })).toBeVisible();
  await expect(timeline.getByText("SIMULADO", { exact: true })).toBeVisible();

  const origin = timeline.locator("[data-case-origin]");
  await expect(origin).toHaveAttribute("data-route-code", "R1_PREPAGO_PLAZO");
  await expect(origin).toHaveAttribute("data-route-status", "eligible_now");
  await expect(origin).toHaveAttribute("data-track", "self_service");
  await expect(origin.getByText("Se puede activar ahora", { exact: true })).toBeVisible();
  await expect(origin.getByText("C1", { exact: true })).toBeVisible();
  await expect(origin.getByText("Autogestión", { exact: true })).toBeVisible();
  await expect(timeline.getByText("R1_PREPAGO_PLAZO", { exact: true })).toHaveCount(0);
  await expect(timeline.getByText("eligible_now", { exact: true })).toHaveCount(0);
  await expect(timeline.getByText("self_service", { exact: true })).toHaveCount(0);
  await expect(timeline.getByText(/no crean un expediente real/i)).toBeVisible();

  const log = timeline.getByLabel("Historial local del expediente");
  const firstEvent = log.getByRole("article", { name: /Evento 1: Expediente local creado/ });
  await expect(firstEvent).toBeVisible();
  await expect(firstEvent).toHaveAttribute("data-event-type", "CASE_CREATED");
  await expect(timeline.getByText("CASE_CREATED", { exact: true })).toHaveCount(0);
  await expect(timeline.getByRole("button", { name: /radicar|enviar al banco|registrar respuesta/i })).toHaveCount(0);
});

test("data authorization increments the history but grants neither service nor legal authority", async ({ page }) => {
  const timeline = await openTermPrepaymentTimeline(page);

  await timeline.getByRole("button", { name: "Simular autorización de datos" }).click();

  await expect(timeline.getByText("Versión 2", { exact: true })).toBeVisible();
  await expect(capabilityRow(timeline, "Autorización de datos").getByText("Sí", { exact: true })).toBeVisible();
  await expect(capabilityRow(timeline, "Servicio aceptado").getByText("No", { exact: true })).toBeVisible();
  await expect(capabilityRow(timeline, "Facultad extrajudicial").getByText("No", { exact: true })).toBeVisible();
  await expect(capabilityRow(timeline, "Poder judicial").getByText("No", { exact: true })).toBeVisible();

  const log = timeline.getByLabel("Historial local del expediente");
  const event = log.getByRole("article", { name: /Evento 2: Autorización de datos registrada/ });
  await expect(event).toBeVisible();
  await expect(event).toHaveAttribute("data-event-type", "DATA_AUTHORIZATION_RECORDED");
  await expect(timeline.getByText("DATA_AUTHORIZATION_RECORDED", { exact: true })).toHaveCount(0);
});

test("attaching evidence derives collecting-evidence state without inventing verification", async ({ page }) => {
  const timeline = await openTermPrepaymentTimeline(page);

  await timeline.getByRole("button", { name: "Simular autorización de datos" }).click();
  await timeline.getByRole("button", { name: "Simular carga de extracto" }).click();

  await expect(timeline.getByText("Versión 3", { exact: true })).toBeVisible();
  await expect(timeline.getByText("Recopilando evidencia", { exact: true })).toBeVisible();

  const log = timeline.getByLabel("Historial local del expediente");
  const evidenceEvent = log.getByRole("article", { name: /Evento 3: Evidencia adjunta/ });
  await expect(evidenceEvent).toBeVisible();
  await expect(evidenceEvent).toHaveAttribute("data-event-type", "EVIDENCE_ATTACHED");
  await expect(timeline.getByText("EVIDENCE_ATTACHED", { exact: true })).toHaveCount(0);
  await expect(timeline.getByText("Evidencia verificada", { exact: true })).toHaveCount(0);
});

test("a legal route can request professional review but cannot auto-complete lawyer work", async ({ page }) => {
  const workspace = await openOpportunityWorkspace(page);
  await workspace.getByLabel("6. ¿Cuál es el estado de pago/cobranza?").selectOption("embargo_or_auction");

  const primary = workspace.getByRole("article", {
    name: /Ruta prioritaria: Revisión jurídica prioritaria del proceso/,
  });
  await primary.getByRole("button", { name: "Preparar esta ruta" }).click();

  const plan = workspace.locator('section[aria-labelledby="case-plan-title"]');
  await plan.getByRole("button", { name: "Ver expediente local de demostración" }).click();
  const timeline = plan.locator('section[aria-labelledby="case-timeline-title"]');

  const origin = timeline.locator("[data-case-origin]");
  await expect(origin).toHaveAttribute("data-track", "legal");
  const accompaniment = origin.getByText("Tipo de acompañamiento", { exact: true }).locator("..");
  await expect(accompaniment.getByText("Revisión jurídica", { exact: true })).toBeVisible();
  await expect(timeline.getByText("legal", { exact: true })).toHaveCount(0);
  await expect(capabilityRow(timeline, "Revisión profesional").getByText("No", { exact: true })).toBeVisible();

  await timeline.getByRole("button", { name: "Simular solicitud de revisión" }).click();

  await expect(timeline.getByText("Versión 2", { exact: true })).toBeVisible();
  await expect(timeline.getByText("En revisión", { exact: true })).toBeVisible();
  await expect(timeline.getByText(/no puede marcarla automáticamente como completada/i)).toBeVisible();
  await expect(timeline.getByText(/debe completarla un profesional autorizado/i)).toBeVisible();
  await expect(timeline.getByText("lawyer", { exact: true })).toHaveCount(0);
  await expect(timeline.getByRole("button", { name: /completar revisión|revisión completada/i })).toHaveCount(0);
  await expect(capabilityRow(timeline, "Revisión profesional").getByText("No", { exact: true })).toBeVisible();

  const log = timeline.getByLabel("Historial local del expediente");
  const event = log.getByRole("article", { name: /Evento 2: Revisión profesional solicitada/ });
  await expect(event).toBeVisible();
  await expect(event).toHaveAttribute("data-event-type", "PROFESSIONAL_REVIEW_REQUESTED");
});
