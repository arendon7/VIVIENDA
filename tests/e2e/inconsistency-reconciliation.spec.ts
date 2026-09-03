import { expect, test, type Page } from "@playwright/test";

type ReconciliationAnswers = {
  kind: string;
  specificity?: string;
  evidence?: string;
  product?: string;
  judicial?: string;
};

async function completeReconciliation(page: Page, answers: ReconciliationAnswers) {
  await page.goto("/revisar-diferencia");
  await page.getByLabel(answers.kind, { exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel(answers.specificity ?? "Sí, puedo señalar la diferencia concreta", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("radio", { name: answers.evidence ?? "Tengo dos fuentes para contrastar" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel(answers.product ?? "Crédito hipotecario de vivienda", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel(answers.judicial ?? "No; no conozco un proceso judicial", { exact: true }).check();
  await page.getByRole("button", { name: "Revisar la diferencia" }).click();
}

test.describe("Inconsistency Reconciliation v0.15", () => {
  test("annual projection variance starts with education and does not unlock R7", async ({ page }) => {
    await completeReconciliation(page, {
      kind: "La proyección anual no coincide con lo que realmente ocurrió",
    });

    await expect(page.getByRole("heading", { name: "La diferencia puede tener una explicación estructural antes de ser un problema." })).toBeFocused();
    await expect(page.getByText("Entender antes de escalar", { exact: true })).toBeVisible();
    await expect(page.getByText("La proyección anual usa supuestos y no es una garantía de la trayectoria real.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Auditar la diferencia" })).toHaveCount(0);
  });

  test("missing information remains self-service before escalation", async ({ page }) => {
    await completeReconciliation(page, {
      kind: "Me falta información que la entidad no me ha aclarado",
      evidence: "No tengo ningún soporte a la mano",
    });

    await expect(page.getByText("Falta información", { exact: true })).toBeVisible();
    await expect(page.getByText("Conseguir la información que falta")).toBeVisible();
    await expect(page.getByText("Solicitud concreta de la información que necesitas")).toBeVisible();
    await expect(page.getByRole("link", { name: "Auditar la diferencia" })).toHaveCount(0);
  });

  test("vague concern with two declared sources does not become R7", async ({ page }) => {
    await completeReconciliation(page, {
      kind: "El extracto parece decir algo distinto a lo pactado",
      specificity: "No todavía; sé que algo no me cuadra",
    });

    await expect(page.getByText("Falta información", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Auditar la diferencia" })).toHaveCount(0);
    await expect(page.getByLabel("Límites de este resultado")).toContainText("no concede C2 ni C3");
  });

  test("specific payment allocation mismatch with two sources unlocks contextual R7 audit", async ({ page }) => {
    await completeReconciliation(page, {
      kind: "Hice un pago o abono y no entiendo cómo lo aplicaron",
    });

    await expect(page.getByText("Vale la pena auditar", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Auditar la diferencia" })).toHaveAttribute("href", "/auditoria-hipotecaria");
    await expect(page.getByText("Auditar y documentar una posible reclamación")).toBeVisible();
    await expect(page.getByText("Instrucción/comprobante del pago")).toBeVisible();
    await expect(page.getByText("Extracto donde se vea la aplicación efectiva")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Qué opciones aparecen con tus respuestas" })).toBeVisible();
    await expect(page.locator('[data-route-code="R7_RECLAMACION"]')).toBeVisible();
    await expect(page.getByText("R7", { exact: true })).toHaveCount(0);
    await expect(page.getByText("R7_RECLAMACION", { exact: true })).toHaveCount(0);
  });

  test("one-source insurance concern stays in evidence comparison", async ({ page }) => {
    await completeReconciliation(page, {
      kind: "Hay un seguro, tarifa o cobro que no identifico",
      evidence: "Tengo una sola fuente",
    });

    await expect(page.getByText("Comparar fuentes", { exact: true })).toBeVisible();
    await expect(page.getByText("Comparar las fuentes antes de escalar")).toBeVisible();
    await expect(page.getByRole("link", { name: "Auditar la diferencia" })).toHaveCount(0);
  });

  test("balance or term comparison requires matching cutoff evidence", async ({ page }) => {
    await completeReconciliation(page, {
      kind: "El saldo, plazo o cuotas restantes no me cuadran",
    });

    await expect(page.getByText("Vale la pena auditar", { exact: true })).toBeVisible();
    await expect(page.getByText("Fechas de corte comparables de ambas fuentes")).toBeVisible();
    await expect(page.getByText("Saldo/plazo de la segunda fuente con fecha de corte comparable")).toBeVisible();
  });

  test("judicial state keeps R10 ahead of an ordinary mismatch", async ({ page }) => {
    await completeReconciliation(page, {
      kind: "El extracto parece decir algo distinto a lo pactado",
      judicial: "Sí; recibí un documento de juzgado o sé que hay un proceso",
    });

    await expect(page.getByText("Revisión prioritaria", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver qué documentos preparar" })).toHaveAttribute("href", "#evidencia");
    await expect(page.locator('a[href="/verificar"]')).toHaveCount(0);
    await expect(page.getByText("Revisión jurídica prioritaria del proceso")).toBeVisible();
    await expect(page.getByRole("link", { name: "Auditar la diferencia" })).toHaveCount(0);
    await expect(page.getByLabel("Límites de este resultado")).toContainText(/calcula términos ni genera una estrategia de defensa/);
    await expect(page.locator('[data-route-code="R10_EXECUTIVE_DEFENSE"]')).toBeVisible();
    await expect(page.getByText("R10", { exact: true })).toHaveCount(0);
    await expect(page.getByText("R10_EXECUTIVE_DEFENSE", { exact: true })).toHaveCount(0);
  });

  test("unknown product is classified before mortgage-specific escalation", async ({ page }) => {
    await completeReconciliation(page, {
      kind: "La tasa o modalidad no coincide con lo que esperaba",
      product: "No estoy seguro",
    });

    await expect(page.getByText("Falta información", { exact: true })).toBeVisible();
    await expect(page.getByText("Confirmar qué tipo de financiación tienes")).toBeVisible();
    await expect(page.getByRole("link", { name: "Auditar la diferencia" })).toHaveCount(0);
  });

  test("housing leasing keeps factual reconciliation without mortgage Article 20 language", async ({ page }) => {
    await completeReconciliation(page, {
      kind: "El extracto parece decir algo distinto a lo pactado",
      product: "Leasing habitacional",
    });

    await expect(page.getByText("Comparar fuentes", { exact: true })).toBeVisible();
    await expect(page.getByText(/no copia automáticamente al leasing procedimientos jurídicos propios del crédito hipotecario/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Auditar la diferencia" })).toHaveCount(0);
    await expect(page.getByText(/artículo 20/i)).toHaveCount(0);
  });

  test("C0 result never makes automatic illegality, bank-error or refund promises", async ({ page }) => {
    await completeReconciliation(page, {
      kind: "Hice un pago o abono y no entiendo cómo lo aplicaron",
    });

    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("el banco se equivocó");
    expect(body).not.toContain("esto es ilegal");
    expect(body).not.toContain("te cobraron de más");
    expect(body).not.toContain("te deben devolver");
    expect(body).not.toMatch(/\d+\s*%\s+de\s+probabilidad/);
    await expect(page.getByLabel("Límites de este resultado")).toContainText("no concluye que exista un error, ilegalidad, fraude o devolución");
  });

  test("first screen is anonymous, keyboard reachable and mobile safe", async ({ page }) => {
    await page.goto("/revisar-diferencia");
    await expect(page.getByText("No necesitas nombre, cédula, correo, teléfono ni documentos")).toBeVisible();
    await expect(page.getByLabel(/nombre/i)).toHaveCount(0);
    await expect(page.getByLabel(/correo/i)).toHaveCount(0);
    await expect(page.getByLabel(/teléfono/i)).toHaveCount(0);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
});
