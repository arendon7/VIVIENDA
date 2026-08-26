import { expect, test, type Page } from "@playwright/test";

type PressureAnswers = {
  product?: string;
  state: string;
  change?: string;
  outlook?: string;
  inconsistency?: string;
};

async function completeTriage(page: Page, answers: PressureAnswers) {
  await page.goto("/ayuda");
  await page.getByLabel(answers.product ?? "Crédito hipotecario de vivienda", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel(answers.state, { exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel(answers.change ?? "No", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel(answers.outlook ?? "Puedo pagarla", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel(answers.inconsistency ?? "No, solo quiero resolver la presión de pago", { exact: true }).check();
  await page.getByRole("button", { name: "Ver qué hacer ahora" }).click();
}

test.describe("Payment Pressure v0.14", () => {
  test("current borrower at risk gets prevention without attorney conversion", async ({ page }) => {
    await completeTriage(page, {
      state: "Estoy al día",
      change: "Sí",
      outlook: "Está en riesgo",
    });

    await expect(page.getByRole("heading", { name: "Aún no reportas mora: este es el mejor momento para actuar preventivamente." })).toBeFocused();
    await expect(page.getByText("Prevención", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Revisar la diferencia" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Revisar el documento que recibí" })).toHaveCount(0);
    await expect(page.getByText("Preparar una conversación temprana con tu entidad")).toBeVisible();
  });

  test("early arrears is prompt action, not legal urgency", async ({ page }) => {
    await completeTriage(page, {
      state: "Me atrasé recientemente",
      outlook: "No puedo pagarla completa",
    });

    await expect(page.getByText("Actuar pronto", { exact: true })).toBeVisible();
    await expect(page.getByText("Hay mora temprana reportada: conviene actuar pronto.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Revisar el documento que recibí" })).toHaveCount(0);
  });

  test("collections is clearly separated from a judicial process", async ({ page }) => {
    await completeTriage(page, {
      state: "Ya me están contactando para cobrar",
      outlook: "No puedo pagarla completa",
    });

    await expect(page.getByText("Actuar pronto", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cobranza no es lo mismo que proceso judicial." })).toBeVisible();
    await expect(page.getByText("Una gestión de cobranza no demuestra por sí sola que exista un proceso judicial.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Revisar el documento que recibí" })).toHaveCount(0);
  });

  test("prelegal remains extrajudicial in the user result", async ({ page }) => {
    await completeTriage(page, {
      state: "Me informaron que está en cobro prejurídico / prelegal",
    });

    await expect(page.getByText("Actuar pronto", { exact: true })).toBeVisible();
    await expect(page.getByText(/extraprocesal/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cobranza no es lo mismo que proceso judicial." })).toBeVisible();
  });

  test("reported executive process prioritizes document review and R10", async ({ page }) => {
    await completeTriage(page, {
      state: "Recibí un documento de juzgado o sé que hay un proceso judicial",
      outlook: "No puedo pagarla completa",
    });

    await expect(page.getByText("Revisión prioritaria", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Revisar el documento que recibí" })).toHaveAttribute("href", "/verificar");
    await expect(page.getByText("Revisión jurídica prioritaria del proceso")).toBeVisible();
    await expect(page.getByRole("link", { name: "Revisar la diferencia" })).toHaveCount(0);
    await expect(page.getByText("No calcula términos procesales, no genera una defensa y no garantiza resultados.", { exact: true })).toBeVisible();
  });

  test("reported embargo or auction state remains priority review", async ({ page }) => {
    await completeTriage(page, {
      state: "Conozco un embargo, secuestro, remate u otra actuación avanzada",
      outlook: "No puedo pagarla completa",
    });

    await expect(page.getByText("Revisión prioritaria", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Revisar el documento que recibí" })).toBeVisible();
  });

  test("unknown stage asks for information instead of lawyer escalation", async ({ page }) => {
    await completeTriage(page, {
      state: "No sé en qué etapa estoy",
      outlook: "No estoy seguro",
    });

    await expect(page.getByText("Falta ubicar la etapa", { exact: true })).toBeVisible();
    await expect(page.getByText("Confirmar el estado antes de decidir")).toBeVisible();
    await expect(page.getByRole("link", { name: "Revisar la diferencia" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Revisar el documento que recibí" })).toHaveCount(0);
  });

  test("explicit inconsistency unlocks contextual R7 audit, not generic legal cross-sell", async ({ page }) => {
    await completeTriage(page, {
      state: "Estoy al día",
      inconsistency: "Hay un cobro o aplicación de pago que no entiendo",
    });

    await expect(page.getByText("Revisar una diferencia", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Revisar la diferencia" })).toHaveAttribute("href", "/auditoria-hipotecaria");
    await expect(page.getByText("Auditar y documentar una posible reclamación")).toBeVisible();
  });

  test("R10 remains primary if a judicial process and inconsistency coexist", async ({ page }) => {
    await completeTriage(page, {
      state: "Recibí un documento de juzgado o sé que hay un proceso judicial",
      inconsistency: "Un extracto o condición parece no coincidir con lo pactado",
    });

    await expect(page.getByText("Revisión prioritaria", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Revisar el documento que recibí" })).toHaveAttribute("href", "/verificar");
    await expect(page.getByRole("link", { name: "Revisar la diferencia" })).toHaveCount(0);
  });

  test("housing leasing does not receive mortgage Article 20 route", async ({ page }) => {
    await completeTriage(page, {
      product: "Leasing habitacional",
      state: "Estoy al día",
      change: "Sí",
      outlook: "Está en riesgo",
    });

    await expect(page.getByText("Prevención", { exact: true })).toBeVisible();
    await expect(page.getByText("Leasing habitacional requiere reglas propias; no aplicamos automáticamente procedimientos del crédito hipotecario.")).toBeVisible();
    await expect(page.getByText(/artículo 20/i)).toHaveCount(0);
  });

  test("first screen requests no identity/contact and is keyboard/mobile safe", async ({ page }) => {
    await page.goto("/ayuda");
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