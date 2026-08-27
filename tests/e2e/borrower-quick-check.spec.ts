import { expect, test } from "@playwright/test";

async function completeQuickCheck(
  page: import("@playwright/test").Page,
  modality: "Pesos" | "UVR" = "Pesos",
) {
  await page.goto("/revisar");

  await page.getByRole("radio", { name: "Crédito hipotecario" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("radio", { name: modality, exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("¿Cuánto capital debes aproximadamente?").fill("180000000");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("¿Cuánto pagas aproximadamente cada mes?").fill("2100000");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("¿Cuántos años te faltan aproximadamente?").fill("17");
  await page.getByRole("button", { name: "Ver mi primera lectura" }).click();
}

async function buildGuidedMortgageTwin(page: import("@playwright/test").Page) {
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
  await page.getByRole("button", { name: "Construir mi Mortgage Twin" }).click();

  await expect(page.getByRole("heading", { name: "Tu fotografía declarada ya tiene la base material del snapshot." })).toBeVisible();
  await expect(page.getByText("Mortgage Twin guiado · C1", { exact: true })).toBeVisible();
}

async function openOpportunityWorkspace(page: import("@playwright/test").Page) {
  await buildGuidedMortgageTwin(page);
  await page.getByRole("button", { name: "Ver mi Loan Health y rutas" }).click();
  await expect(page.getByRole("heading", { name: "Entiende primero el estado de decisión; después elige una ruta." })).toBeVisible();

  const workspace = page.locator('section[aria-labelledby="opportunity-workspace-title"]');
  await expect(workspace.getByText(/Partimos de tu Mortgage Twin/)).toBeVisible();
  await expect(workspace.getByRole("radio", { name: "Crédito hipotecario de vivienda" })).toBeChecked();
  return workspace;
}

test("keeps the home conceptual Mortgage Twin outside verified C3 and exposes only real routes", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Vista conceptual · no verificada", { exact: true })).toBeVisible();
  await expect(page.getByText("C3 · Verificado documentalmente", { exact: true })).toHaveCount(0);
  await expect(page.locator('a[href="#comprar"]')).toHaveCount(0);
  await expect(page.locator('a[href="#diy"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Revisar mi crédito" })).toHaveAttribute("href", "/revisar");
  await expect(page.getByRole("link", { name: "Preparar mi ruta" })).toHaveAttribute("href", "/revisar");
});

test("delivers first useful result without asking identity or contact data", async ({ page }) => {
  await completeQuickCheck(page);

  await expect(page.getByRole("heading", { name: "Ya podemos construir una primera fotografía de tu crédito." })).toBeVisible();
  await expect(page.getByText("C1 · Estimación")).toBeVisible();
  await expect(page.getByText("$ 180.000.000")).toBeVisible();
  const resultRegion = page.getByRole("region", {
    name: /Ya podemos construir una primera fotografía/,
  });
  await expect(
    resultRegion.getByRole("link", { name: "Volver al inicio" }),
  ).toHaveAttribute("href", "/");
  await expect(page.getByText("Guardar esto para después", { exact: true })).toHaveCount(0);

  const forbiddenInputs = ["cédula", "teléfono", "correo", "email"];
  for (const name of forbiddenInputs) {
    await expect(page.getByLabel(new RegExp(name, "i"))).toHaveCount(0);
  }
});

test("exposes task progress semantically", async ({ page }) => {
  await page.goto("/revisar");

  const progress = page.getByRole("progressbar", { name: "Progreso del Quick Check" });
  await expect(progress).toHaveAttribute("aria-valuenow", "1");
  await expect(progress).toHaveAttribute("aria-valuemax", "5");

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(progress).toHaveAttribute("aria-valuenow", "2");
});

test("allows unknown product and modality instead of blocking the journey", async ({ page }) => {
  await page.goto("/revisar");

  await page.getByRole("radio", { name: "No estoy seguro" }).first().check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("radio", { name: "No estoy seguro" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByLabel("¿Cuánto capital debes aproximadamente?")).toBeVisible();
});

test("supports keyboard-only progression through the first questions", async ({ page }) => {
  await page.goto("/revisar");

  await page.getByRole("radio", { name: "Crédito hipotecario" }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Continuar" }).focus();
  await page.keyboard.press("Enter");

  await expect(page.getByText("¿Tu crédito está en pesos o UVR?")).toBeVisible();
});

test("does not overflow horizontally on compact viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await completeQuickCheck(page);

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test("does not grant C2 from placeholder or empty financial inputs", async ({ page }) => {
  await completeQuickCheck(page, "Pesos");
  await page.getByRole("button", { name: "Continuar con más precisión" }).click();

  await page.getByRole("radio", { name: "Cuota constante en pesos" }).check();
  await expect(page.getByText("C2 · Simulación modelada", { exact: true })).toHaveCount(0);

  await page.getByLabel("Tasa efectiva anual del crédito").fill("12");
  await expect(page.getByText("C2 · Simulación modelada", { exact: true })).toHaveCount(0);
});

test("upgrades a compatible peso case from C1 to a real C2 modeled scenario", async ({ page }) => {
  await completeQuickCheck(page, "Pesos");
  await page.getByRole("button", { name: "Continuar con más precisión" }).click();

  await page.getByLabel("Tasa efectiva anual del crédito").fill("12");
  await page.getByLabel("Número de cuotas que te faltan").fill("204");
  await page.getByRole("radio", { name: "Cuota constante en pesos" }).check();

  await expect(page.getByText("C2 · Simulación modelada", { exact: true })).toBeVisible();
  await expect(page.getByText("Capital adicional que aportarías durante el escenario")).toBeVisible();
  await expect(page.getByText("Intereses futuros nominales que el modelo estima que dejarían de causarse")).toBeVisible();
  await expect(page.getByText("Valor atribuible a VIVIENDA en esta simulación self-service")).toBeVisible();
});

test("refuses to apply the peso annuity model to UVR", async ({ page }) => {
  await completeQuickCheck(page, "UVR");
  await page.getByRole("button", { name: "Continuar con más precisión" }).click();

  await expect(page.getByText("No vamos a forzar una fórmula de pesos.")).toBeVisible();
  await expect(page.getByText("C2 · Simulación modelada", { exact: true })).toHaveCount(0);
});

test("rejects unsupported document types before guided transcription", async ({ page }) => {
  await page.goto("/verificar");

  await page.getByLabel("Seleccionar extracto local").setInputFiles({
    name: "notas.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("demo"),
  });

  await expect(page.locator("#statement-file-error")).toHaveText("Usa un archivo PDF, JPG o PNG.");
  await expect(page.getByRole("heading", { name: "Mira tu extracto y completa solo lo que puedas identificar con seguridad." })).toHaveCount(0);
});

test("keeps locally transcribed statement data at C1 and never grants C3", async ({ page }) => {
  await buildGuidedMortgageTwin(page);

  const twin = page.locator('section[aria-labelledby="mortgage-twin-title"]');
  await expect(twin.getByText("Datos transcritos por ti desde un extracto local. VIVIENDA no leyó ni verificó el archivo.", { exact: true })).toBeVisible();
  await expect(twin.getByLabel("Nivel de precisión: Estimación")).toHaveText("C1 · Estimación");
  await expect(page.getByText("C3 · Verificado documentalmente", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Demostración · extracción simulada", { exact: true })).toHaveCount(0);
});

test("keeps unknown product as classification work instead of automatic legal escalation", async ({ page }) => {
  const workspace = await openOpportunityWorkspace(page);
  await workspace.getByRole("radio", { name: "No estoy seguro" }).check();

  const primary = workspace.getByRole("article", { name: /Ruta prioritaria: Primero necesitamos clasificar el producto/ });
  await expect(primary).toBeVisible();
  await expect(primary.getByText("Vale la pena evaluar", { exact: true })).toBeVisible();
  await expect(primary.getByText("Revisión humana", { exact: true })).toHaveCount(0);
  await expect(workspace.getByText(/no obliga a escalar el caso/i)).toBeVisible();
});

test("prioritizes term prepayment when a covered mortgage user wants to finish sooner", async ({ page }) => {
  const workspace = await openOpportunityWorkspace(page);

  await workspace.getByRole("radio", { name: "Terminar antes" }).check();
  await workspace.getByLabel("3. ¿Cuánto capital adicional quieres comparar?").fill("300000");

  const primary = workspace.getByRole("article", { name: /Ruta prioritaria: Usar abonos adicionales para reducir plazo/ });
  await expect(primary).toBeVisible();
  await expect(primary.getByText("Se puede activar ahora", { exact: true })).toBeVisible();
  await expect(primary.getByText(/capital adicional proviene del usuario/i)).toBeVisible();
});

test("elevates Article 24 assignment only after the user declares a binding offer", async ({ page }) => {
  const workspace = await openOpportunityWorkspace(page);

  await workspace.getByLabel("Sí, ya existe una oferta vinculante real.").check();

  const primary = workspace.getByRole("article", { name: /Ruta prioritaria: Activar la cesión con oferta vinculante/ });
  await expect(primary).toBeVisible();
  const nextStep = primary.locator(".result-callout");
  await expect(nextStep.getByText(/plazo legal máximo de 10 días hábiles/i)).toBeVisible();
  await expect(primary.getByText(/no son el tiempo para que un nuevo banco apruebe/i)).toBeVisible();
});

test("makes judicial distress primary instead of hiding it behind optimization", async ({ page }) => {
  const workspace = await openOpportunityWorkspace(page);

  await workspace.getByLabel("6. ¿Cuál es el estado de pago/cobranza?").selectOption("embargo_or_auction");

  const primary = workspace.getByRole("article", { name: /Ruta prioritaria: Revisión jurídica prioritaria del proceso/ });
  await expect(primary).toBeVisible();
  await expect(primary.getByText("Revisión jurídica necesaria", { exact: true })).toBeVisible();
  await expect(primary.getByText("Revisión humana", { exact: true })).toBeVisible();
});

test("explains the 40 percent rule without turning current payment burden into automatic illegality", async ({ page }) => {
  const workspace = await openOpportunityWorkspace(page);

  await workspace.getByLabel("Sí, quiero que el router evalúe la ruta de reestructuración.").check();
  await workspace.getByLabel("Ingreso familiar actualmente acreditable").fill("5000000");
  await workspace.getByLabel("Primera cuota que propondrías después de reestructurar").fill("2100000");

  await expect(workspace.getByText("El 40% no se usa como detector automático de ilegalidad.", { exact: true })).toBeVisible();
  const loanHealth = workspace.locator('section[aria-labelledby="loan-health-title"]');
  await expect(loanHealth.getByText(/no convierte una cuota vigente superior a ese porcentaje en una infracción automática/i)).toBeVisible();
  await expect(
    workspace.getByText("La primera cuota propuesta supera el 40% del ingreso familiar acreditado y debe rediseñarse.", { exact: true }),
  ).toBeVisible();
});

test("builds an unknown-product Case Plan without pretending to save or open a matter", async ({ page }) => {
  const workspace = await openOpportunityWorkspace(page);
  await workspace.getByRole("radio", { name: "No estoy seguro" }).check();

  const primary = workspace.getByRole("article", { name: /Ruta prioritaria: Primero necesitamos clasificar el producto/ });
  await primary.getByRole("button", { name: "Preparar esta ruta" }).click();

  const plan = workspace.locator('section[aria-labelledby="case-plan-title"]');
  await expect(plan.getByRole("heading", { name: /Clasificar el producto antes de escoger una ruta jurídica/ })).toBeVisible();
  await expect(plan.getByText("Vista local de planificación.", { exact: true })).toBeVisible();
  await expect(plan.getByText(/todavía no crea un expediente ni guarda tu información/i)).toBeVisible();
  await expect(plan.getByText(/no prepara todavía una solicitud del artículo 20/i)).toBeVisible();
  await expect(plan.getByRole("button", { name: /guardar/i })).toHaveCount(0);
  await expect(plan.getByText(/completad[oa]/i)).toHaveCount(0);
});

test("keeps the Article 24 clock relative until real delivery evidence exists", async ({ page }) => {
  const workspace = await openOpportunityWorkspace(page);

  await workspace.getByLabel("Sí, ya existe una oferta vinculante real.").check();

  const primary = workspace.getByRole("article", { name: /Ruta prioritaria: Activar la cesión con oferta vinculante/ });
  await primary.getByRole("button", { name: "Preparar esta ruta" }).click();

  const plan = workspace.locator('section[aria-labelledby="case-plan-title"]');
  await expect(plan.getByRole("heading", { name: "Plan para activar la cesión del artículo 24" })).toBeVisible();
  await expect(plan.getByText(/Máximo 10 días hábiles después de la entrega comprobada/i)).toBeVisible();
  await expect(plan.getByText(/Sin fecha real de entrega no se calcula una fecha límite/i)).toBeVisible();
  await expect(plan.getByText(/El trigger todavía no está establecido/i)).toBeVisible();
  await expect(plan.getByText(/El reloj no se considera iniciado por seleccionar esta ruta o generar el plan/i)).toBeVisible();
});

test("keeps executive-defense Case Plan behind professional review and contains no automated defense recipe", async ({ page }) => {
  const workspace = await openOpportunityWorkspace(page);

  await workspace.getByLabel("6. ¿Cuál es el estado de pago/cobranza?").selectOption("embargo_or_auction");

  const primary = workspace.getByRole("article", { name: /Ruta prioritaria: Revisión jurídica prioritaria del proceso/ });
  await primary.getByRole("button", { name: "Preparar esta ruta" }).click();

  const plan = workspace.locator('section[aria-labelledby="case-plan-title"]');
  await expect(plan.getByRole("heading", { name: "Plan de preparación para revisión jurídica prioritaria" })).toBeVisible();
  await expect(plan.getByRole("article", { name: /Fase 2: Revisión profesional/ })).toBeVisible();
  await expect(plan.getByRole("article", { name: /Fase 3: Definir estrategia/ })).toBeVisible();
  await expect(plan.getByText("Revisión jurídica prioritaria", { exact: true })).toBeVisible();
  await expect(plan.getByText(/no contiene excepciones, recursos ni instrucciones procesales automáticas/i)).toBeVisible();
  await expect(plan.getByRole("button", { name: /presentar|radicar|interponer|oponerse/i })).toHaveCount(0);
});

test("builds an Article 20 seasonal plan for the next window instead of saying file now", async ({ page }) => {
  const workspace = await openOpportunityWorkspace(page);

  await workspace.getByLabel("Sí, quiero que el router evalúe la ruta de reestructuración.").check();

  const article20 = workspace.getByRole("article", { name: /Ruta alternativa: Preparar la próxima ventana del artículo 20/ });
  await expect(article20).toBeVisible();
  await article20.getByRole("button", { name: "Preparar esta ruta" }).click();

  const plan = workspace.locator('section[aria-labelledby="case-plan-title"]');
  await expect(plan.getByRole("heading", { name: "Plan de preparación para la próxima ventana del artículo 20" })).toBeVisible();
  await expect(plan.getByText("enero-febrero de 2027", { exact: true })).toBeVisible();
  await expect(plan.getByText(/no afirma que pueda radicarse hoy bajo la ventana especial/i)).toBeVisible();
  await expect(plan.getByRole("button", { name: /radicar hoy/i })).toHaveCount(0);
});