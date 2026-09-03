import { expect, test } from "@playwright/test";

test.describe("Auditoría Hipotecaria assisted preview", () => {
  test("keeps technical route identity traceable without exposing engineering language", async ({ page }) => {
    await page.goto("/auditoria-hipotecaria");

    await expect(page.getByRole("heading", { name: "Entiende una diferencia concreta antes de escalar." })).toBeVisible();
    await expect(page.getByText("Vista previa del servicio asistido · aún no contratado")).toBeVisible();
    await expect(page.getByText("Extracto como guía", { exact: true })).toBeVisible();
    await expect(page.getByText(/Esta vista previa muestra cómo se organizaría la evidencia/)).toBeVisible();

    const serviceState = page.locator('[data-route-code="R7_RECLAMACION"]');
    await expect(serviceState).toBeVisible();
    await expect(serviceState).toHaveAttribute("data-case-track", "assisted");
    await expect(serviceState).toHaveAttribute("data-service-code", "MORTGAGE_AUDIT_R7_V1");
    await expect(serviceState.getByText("Auditoría orientada por evidencia", { exact: true })).toBeVisible();
    await expect(serviceState.getByText("Acompañamiento profesional", { exact: true })).toBeVisible();
    await expect(serviceState.getByText("Requerida", { exact: true })).toBeVisible();
    await expect(serviceState.getByText("No incluida", { exact: true })).toHaveCount(2);

    await expect(page.getByText("R7", { exact: true })).toHaveCount(0);
    await expect(page.getByText("R7 · Auditoría / posible reclamación", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Track", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Assisted", { exact: true })).toHaveCount(0);
    await expect(page.getByText("router", { exact: true })).toHaveCount(0);
  });

  test("renders professional conclusions in ordinary language while preserving finding codes in data attributes", async ({ page }) => {
    await page.goto("/auditoria-hipotecaria");

    const expectedFindings = [
      ["explained", "La diferencia puede explicarse con la evidencia"],
      ["needs_more_evidence", "Falta evidencia para concluir"],
      ["possible_inconsistency", "Hay una diferencia que merece actuación o revisión"],
      ["route_change_required", "Los hechos obligan a cambiar la prioridad"],
    ] as const;

    for (const [status, label] of expectedFindings) {
      const finding = page.locator(`[data-finding-status="${status}"]`);
      await expect(finding).toBeVisible();
      await expect(finding.getByText(label, { exact: true })).toBeVisible();
      await expect(page.getByText(status, { exact: true })).toHaveCount(0);
    }

    await expect(page.getByText("illegal", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Resultado profesional previsto", { exact: true })).toBeVisible();
  });

  test("keeps execution event types auditable without showing them as customer copy", async ({ page }) => {
    await page.goto("/auditoria-hipotecaria");

    const expectedEvents = [
      ["CASE_CREATED", "Crear el expediente de revisión"],
      ["DATA_AUTHORIZATION_RECORDED", "Autorizar el tratamiento de datos"],
      ["SERVICE_AGREEMENT_ACCEPTED", "Aceptar el alcance del servicio"],
      ["EVIDENCE_REQUESTED", "Definir la evidencia necesaria"],
      ["EVIDENCE_ATTACHED", "Incorporar la evidencia"],
      ["EVIDENCE_VERIFIED", "Verificar que la evidencia corresponde al hecho"],
      ["PROFESSIONAL_REVIEW_REQUESTED", "Solicitar la revisión profesional"],
      ["PROFESSIONAL_REVIEW_COMPLETED", "Emitir la conclusión profesional"],
    ] as const;

    for (const [eventType, label] of expectedEvents) {
      const event = page.locator(`[data-event-type="${eventType}"]`);
      await expect(event).toBeVisible();
      await expect(event.getByText(label, { exact: true })).toBeVisible();
      await expect(page.getByText(eventType, { exact: true })).toHaveCount(0);
    }

    await expect(page.getByText("SUBMISSION_RECORDED", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Ver qué evidencia preparar" }).first()).toHaveAttribute("href", "#evidence-heading");
    await expect(page.getByRole("link", { name: "Ver qué evidencia preparar" }).last()).toHaveAttribute("href", "#evidence-heading");
    await expect(page.getByRole("link", { name: "Preparar mi evidencia" })).toHaveCount(0);
  });

  test("preserves no-power, no-guarantee and priority-reroute boundaries", async ({ page }) => {
    await page.goto("/auditoria-hipotecaria");

    await expect(page.getByRole("heading", { name: "Aceptar una auditoría no equivale a contratar representación." })).toBeVisible();
    await expect(page.getByText("No concede facultad extrajudicial.")).toBeVisible();
    await expect(page.getByText("No concede poder judicial.")).toBeVisible();
    await expect(page.getByText("No registra una reclamación como radicada.")).toBeVisible();
    await expect(page.getByText("No garantiza ahorro, corrección o resultado.")).toBeVisible();
    await expect(page.getByText(/Un servicio real requeriría autorización de datos/)).toBeVisible();

    const rerouteBoundary = page.locator('[data-reroute-route-code="R10_EXECUTIVE_DEFENSE"]');
    await expect(rerouteBoundary).toContainText("Si aparece un proceso ejecutivo");
    await expect(rerouteBoundary).toContainText("debe priorizarse la revisión jurídica del proceso");
    await expect(page.getByText("R10", { exact: true })).toHaveCount(0);
  });

  test("is keyboard reachable and has no horizontal overflow", async ({ page }) => {
    await page.goto("/auditoria-hipotecaria");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
});
