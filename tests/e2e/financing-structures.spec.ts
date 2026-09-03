import { expect, test } from "@playwright/test";

test.describe("Financing Structures v0.17", () => {
  test("orients contractual structure and denomination without bank claims", async ({ page }) => {
    await page.goto("/comprar/financiacion");

    await expect(page.getByRole("heading", { name: "Entiende qué estructuras vale la pena comparar" })).toBeVisible();
    await expect(page.getByText("No necesitas nombre, cédula, correo, teléfono ni consulta a centrales")).toBeVisible();

    await page.getByLabel("Quiero adquirir la propiedad desde la compra").check();
    await page.getByLabel("Priorizo previsibilidad nominal en pesos").check();
    await page.getByRole("button", { name: "Ver qué estructuras explorar" }).click();

    await expect(page.getByRole("heading", { name: "Tu siguiente comparación ya puede ser más precisa" })).toBeFocused();

    const mortgage = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Crédito hipotecario" }) });
    const leasing = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Leasing habitacional" }) });
    const pesos = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Pesos" }) });
    const uvr = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "UVR" }) });

    await expect(mortgage).toContainText("Explorar primero");
    await expect(leasing).toContainText("Comparar después");
    await expect(pesos).toContainText("Explorar primero");
    await expect(uvr).toContainText("Comparar después");

    await expect(page.getByText("Esto orienta tu búsqueda. No es elegibilidad, preaprobación, aprobación, probabilidad de aprobación, ranking de entidades ni cotización de mercado.", { exact: true })).toBeVisible();

    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("bancolombia");
    expect(body).not.toContain("davivienda");
    expect(body).not.toContain("te aprobarán");
    expect(body).not.toContain("probabilidad de éxito");
    expect(body).not.toMatch(/\b\d{1,3}%\s*(match|compatib|aprob)/i);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test("keeps all options unresolved when the user explicitly does not know yet", async ({ page }) => {
    await page.goto("/comprar/financiacion");

    const ownership = page.getByRole("group", { name: "¿Qué es más importante para ti respecto a la propiedad?" });
    const payment = page.getByRole("group", { name: "¿Cómo prefieres evaluar el comportamiento de la obligación?" });

    await ownership.getByLabel("Todavía no lo sé").check();
    await payment.getByLabel("Todavía no lo sé").check();
    await page.getByRole("button", { name: "Ver qué estructuras explorar" }).click();

    await expect(page.getByText("Falta definir preferencia")).toHaveCount(4);
    await expect(page.getByText("Explorar primero")).toHaveCount(0);
    await expect(page.getByLabel("Nivel de precisión: Orientación")).toBeVisible();
  });

  test("keeps leasing and UVR as comparisons rather than automatic winners when accepted", async ({ page }) => {
    await page.goto("/comprar/financiacion");

    await page.getByLabel("Estoy abierto a una opción de adquisición posterior").check();
    await page.getByLabel("Estoy dispuesto a comparar UVR").check();
    await page.getByRole("button", { name: "Ver qué estructuras explorar" }).click();

    const leasing = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Leasing habitacional" }) });
    const uvr = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "UVR" }) });

    await expect(leasing).toContainText("Mantener para comparar");
    await expect(uvr).toContainText("Mantener para comparar");
    await expect(leasing).not.toContainText("Explorar primero");
    await expect(uvr).not.toContainText("Explorar primero");
  });

  test("requires both preferences and exposes the real-quote checklist without fake upload", async ({ page }) => {
    await page.goto("/comprar/financiacion");

    await page.getByRole("button", { name: "Ver qué estructuras explorar" }).click();
    await expect(page.getByText("Responde las dos preguntas para ordenar las estructuras sin adivinar tus preferencias.", { exact: true })).toBeVisible();

    await page.getByLabel("No tengo una preferencia fuerte").check();
    await page.getByLabel("Quiero comparar pesos y UVR").check();
    await page.getByRole("button", { name: "Ver qué estructuras explorar" }).click();

    const details = page.locator("details").filter({ hasText: "Ver los 15 datos que conviene conservar" });
    await details.getByText("Ver los 15 datos que conviene conservar", { exact: true }).click();
    await expect(page.getByText("Entidad o proveedor y fecha/vigencia de la cotización", { exact: true })).toBeVisible();
    await expect(page.getByText("Efectivo total requerido antes y durante el cierre", { exact: true })).toBeVisible();
    await expect(page.getByText("La comparación de cotizaciones reales será una capa separada")).toBeVisible();
    await expect(page.getByRole("button", { name: /subir|cargar|adjuntar/i })).toHaveCount(0);
    await expect(details).toBeVisible();
  });
});
