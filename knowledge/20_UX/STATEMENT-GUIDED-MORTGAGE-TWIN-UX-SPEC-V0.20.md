# STATEMENT-GUIDED MORTGAGE TWIN UX SPEC V0.20

Status: implementation UX specification
Route: `/verificar`
Primary journey: existing borrower
Precision: local reference + C1 guided snapshot + optional C2 compatible model

## 1. Product job

The user has already reached a point where manual approximations are no longer the best next step. They may have come from `/revisar`, where VIVIENDA explicitly says the next precision jump depends on their statement.

The job of `/verificar` in v0.20 is:

> **Help the borrower look at a recent statement and transcribe the few fields that materially improve the Mortgage Twin, without claiming that VIVIENDA read the file.**

This replaces the old public experience that selected a local file and then showed hardcoded simulated “extracted” values.

## 2. Warm path

`/revisar C1/C2 → /verificar → local statement selected → guided transcription → C1 Mortgage Twin → compatible C2 scenario → next decision`

The route should not start with a giant financial form. The local statement establishes context first.

## 3. Hero

Eyebrow:

**Tu extracto como guía**

H1:

**Construye una fotografía más precisa de tu crédito con tu extracto a la vista.**

Supporting copy:

> Selecciona un extracto reciente para tenerlo como referencia local y transcribe solo los datos que cambian el análisis. En esta versión VIVIENDA no sube, lee ni procesa el archivo.

Trust strip:

- Sin contraseña ni token bancario.
- El archivo permanece local en esta versión.
- No usamos OCR ni simulamos haber leído el documento.
- Puedes obtener un Mortgage Twin sin crear cuenta.

Primary CTA is the native file selection control under an explicit permission/truth panel; do not ask identity first.

## 4. Before file selection

Visible panel title:

**Antes de seleccionar tu extracto**

Copy:

1. Usa, idealmente, un extracto reciente de tu crédito hipotecario o leasing habitacional.
2. PDF, JPG o PNG, máximo 15 MB para esta experiencia local.
3. VIVIENDA no enviará el archivo al servidor en v0.20.
4. VIVIENDA no leerá ni extraerá automáticamente los datos del archivo.
5. Tú mirarás el documento y transcribirás los campos relevantes.
6. Esto sigue siendo C1; C3 requerirá procesamiento documental real y reconciliación futura.

Do not use “Subir documento” as the primary label. Preferred label:

**Seleccionar extracto local**

Helper:

> Se usa solo como referencia durante esta pantalla.

## 5. Local-file states

### No file

Only the hero + truth panel + selector are visible.

### Rejected type

Inline error:

**Usa un archivo PDF, JPG o PNG.**

No guided form should open.

### Invalid size

Inline error:

**No pudimos usar este archivo local. Selecciona un PDF, JPG o PNG válido.**

### Too large

Inline error:

**El archivo supera 15 MB. Usa una versión más liviana para esta etapa local.**

### Accepted

Show compact ephemeral chip:

**Referencia local seleccionada · [filename]**

Supporting text:

> El nombre se muestra solo en esta sesión. No forma parte del Mortgage Twin ni de analítica genérica.

Then reveal the guided form.

## 6. Guided form structure

The form is a single progressive page with four semantic sections. It should be easy to complete while the user visually alternates between statement and browser.

No fields are prepopulated with simulated extracted values.

### Section 1 — Identifica el crédito

Heading:

**1. Ubica qué producto y periodo estás viendo**

Fields:

- Entidad o institución — optional context.
- ¿Qué producto aparece en tu extracto?
  - Crédito hipotecario de vivienda.
  - Leasing habitacional.
  - No estoy seguro.
- Fecha de corte del extracto.
- ¿La obligación está en pesos o UVR?
  - Pesos.
  - UVR.
  - No estoy seguro.

Microcopy:

> Si el documento no te permite saberlo con seguridad, elige “No estoy seguro”. Es mejor conservar una incógnita que inventar precisión.

### Section 2 — Construye el snapshot

Heading:

**2. Transcribe la fotografía financiera**

Fields:

- Saldo de capital — required for complete snapshot.
- Pago/cuota/canon total más reciente — optional context.
- Seguros o costos mensuales identificables — optional context.

For balance:

> Busca “saldo de capital”, “capital pendiente” o un concepto equivalente. No uses automáticamente el total a pagar si incluye otros componentes.

For total payment:

> Es contexto. No lo usamos como sustituto de la cuota financiera modelada.

### Section 3 — Datos que habilitan matemática

Heading:

**3. Si aparecen claramente, añade estos datos**

Fields:

- Tasa efectiva anual (EA).
- Cuotas restantes.
- Sistema de amortización:
  - Cuota constante en pesos.
  - Otro sistema.
  - No estoy seguro.

Microcopy:

> Solo transcribe una tasa como EA si el extracto la identifica de forma inequívoca como efectiva anual. No convertimos una tasa ambigua automáticamente.

This section is not required to earn the C1 Mortgage Twin snapshot.

### Section 4 — Review action

Primary button:

**Construir mi Mortgage Twin**

Secondary:

**Cambiar extracto local**

No account creation CTA here.

## 7. Snapshot result hierarchy

If snapshot-material fields are incomplete:

H2:

**Todavía falta información para construir una fotografía completa.**

Show only missing/invalid snapshot fields and a clear edit path. Do not bury them under model requirements.

If snapshot is ready:

Eyebrow:

**Mortgage Twin guiado · C1**

H2:

**Ya organizamos la fotografía que transcribiste de tu extracto.**

Truth line, always visible:

> **Datos transcritos por ti desde un extracto local. VIVIENDA no leyó ni verificó el archivo.**

Core facts:

- producto;
- saldo de capital;
- fecha de corte;
- modalidad;
- institution when supplied;
- total payment when valid/supplied;
- rate/remaining/system when valid/supplied;
- insurance/cost when valid/supplied.

Freshness:

> **Referencia declarada · corte [date] · [N] días respecto a esta evaluación**

Do not invent a “fresh/stale” badge in v0.20.

## 8. Context issues

Invalid optional context fields must be visually separated from material blockers.

Example:

**Hay un dato opcional que conviene revisar**

- El pago total debe ser mayor que cero.
- Seguros/costos no pueden ser negativos.

These issues must not say that the Mortgage Twin or C2 model is blocked when the material inputs are otherwise valid.

## 9. Model readiness after snapshot

### Compatible mortgage in pesos

When model fields are complete:

Callout:

**También tenemos los datos para probar un escenario de prepago.**

Copy:

> El snapshot sigue siendo C1. Si defines un abono adicional, el resultado matemático será una simulación C2 construida sobre los datos que transcribiste.

Ask only one new decision input:

**Abono adicional mensual que quieres probar**

Default may be a modest editable amount only if clearly presented as scenario input; otherwise leave user supplied. Prefer no hidden default if it could be mistaken for recommendation.

CTA:

**Modelar este abono**

Use the existing versioned `compareConstantPaymentPrepayment` engine; do not duplicate formulas.

### Mortgage in pesos but model data missing

Callout:

**Tu Mortgage Twin ya está listo; para modelar un prepago faltan datos.**

Show only:

- tasa EA;
- cuotas restantes;
- sistema compatible.

CTA:

**Completar datos del modelo**

Do not downgrade the valid C1 snapshot.

### UVR

Callout:

**No vamos a aplicar una fórmula de cuota constante en pesos a este crédito UVR.**

Copy:

> El Mortgage Twin C1 sí es útil. Un escenario UVR exige una trayectoria explícita y un modelo compatible; v0.20 no lo inventa desde este extracto.

No peso-prepayment CTA.

### Leasing

Callout:

**Este snapshot corresponde a leasing habitacional.**

Copy:

> No aplicamos automáticamente el modelo de prepago de crédito hipotecario. La estructura contractual y la opción de compra deben conservarse separadas.

No mortgage-prepayment CTA.

## 10. C2 prepayment result

Eyebrow:

**Escenario de prepago · C2**

Headline should express a modeled consequence, never recommendation. Example:

**Con [extra] adicionales al mes, el modelo termina [N] cuotas antes.**

Required facts:

- principal transcribed;
- EA transcribed;
- remaining installments transcribed;
- modeled contractual payment;
- scenario payoff month;
- term reduction;
- user extra principal over scenario;
- nominal future interest avoided by model.

Truth boundary:

> Datos base C1 transcritos por ti + motor determinístico C2. No es verificación contractual, recomendación bancaria ni ahorro garantizado.

Preserve the existing rule that user-contributed extra principal is not “value generated by VIVIENDA”.

If the user edits any material/model field, hide/invalidate the C2 result until recalculated.

## 11. Opportunity routing

Do not automatically render the full `OpportunityWorkspace` immediately beneath the first C1 snapshot if doing so makes the user repeat product information.

v0.20 should first complete the promised job:

**statement → Mortgage Twin → compatible math**

A later slice can pass structured snapshot values directly into Loan Health / Opportunity Router rather than asking duplicate questions.

For v0.20, a simple next action after result is enough:

- **Volver a mi análisis** → `/revisar`
- **Revisar una diferencia** → `/revisar-diferencia` when the user says something does not match, if surfaced contextually.

Do not create a case or professional relationship from this step.

## 12. Privacy and network invariant

The file input must not trigger fetch/XHR/upload to:

- `/api/v1/cases/.../evidence/...`;
- storage provider URLs;
- OCR endpoints;
- third-party processors.

Changing routes may naturally load application assets, but the document bytes themselves remain local.

No financial values or filename in query params.

## 13. Accessibility

- Every field has a visible label.
- File errors use `role="alert"` or an equivalently scoped live region.
- Result H2 receives focus after build.
- Section headings form a logical hierarchy.
- Radio groups use fieldsets/legends.
- Keyboard-only completion works.
- No horizontal overflow at 390 px.
- Error copy states the correction, not merely that “something went wrong”.

## 14. Analytics

Potential events, without material values:

`statement_guided_started`
→ `local_statement_selected`
→ `guided_snapshot_submitted`
→ `guided_snapshot_ready`
→ `guided_model_ready`
→ `guided_prepayment_modeled`

Do not emit filename, institution, balance, payment, rate or document text.

## 15. E2E acceptance

At minimum desktop + mobile must prove:

1. truth boundary before selection;
2. invalid MIME rejected;
3. >15 MB rejected;
4. accepted file reveals an empty guided form, not simulated extracted values;
5. complete material fields produce C1 Mortgage Twin;
6. model fields may be absent while C1 snapshot remains valid;
7. complete mortgage/pesos/constant-payment inputs enable C2 prepayment math;
8. UVR does not invoke the pesos model;
9. leasing does not invoke the mortgage model;
10. editing a model field invalidates stale C2 result;
11. no filename/financial data in URL;
12. no evidence-upload API request caused by local file selection;
13. mobile 390 px has no horizontal overflow.

## 16. Frozen UX principle

> **Use the document to reduce user uncertainty, but never increase platform provenance beyond what the platform actually did.**
