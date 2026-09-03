# ECONOMIC QUOTE COMPARISON UX SPEC v0.19

Date: 2026-08-27
Status: UX contract
Depends on: Quote Normalization v0.18 + Economic Comparison domain v0.19

## 1. User job

After entering two quotes, the user asks:

> **¿Qué cambia económicamente si comparo estas dos cotizaciones bajo los mismos supuestos?**

The UX must answer this without converting a scenario into a promise, lender recommendation or approval claim.

## 2. Entry point

The entry point remains `/comprar/comparar-cotizaciones`.

Do not create a separate route that forces the user to re-enter quote data.

When both quotes are present and the pair is `ready_for_future_economic_model`, the pair-result view adds:

**CTA:** `Modelar escenario económico`

The CTA opens an in-memory scenario panel using the already entered `FinancingQuoteInput` objects.

No quote value is serialized into URL/search params.

## 3. When the CTA is unavailable

If the pair is not `ready_for_future_economic_model`, keep the v0.18 output and explain which material fields still block the next layer.

Do not offer an apparently active economic-model CTA that will predictably fail due to v0.18 incompleteness.

## 4. Scenario panel hierarchy

### Intro

Eyebrow:
`Escenario económico · C2 desde datos C1`

Title:
`Compara flujos bajo supuestos que puedes ver y cambiar`

Body:
`Usamos las dos cotizaciones que acabas de estructurar. Los valores declarados siguen sin verificación documental; el resultado nuevo es un cálculo de escenario.`

### Step 1 — UVR assumption, only if needed

Show only if at least one quote is UVR.

Question:
`¿Qué variación anual de UVR quieres probar?`

Input:
`Variación anual de UVR (%)`

Required copy directly below:
`Es un supuesto de sensibilidad, no una predicción. Si la UVR cambia, este resultado cambia.`

Do not prefill a market/current/expected UVR growth rate.

### Step 2 — leasing purchase option, only per leasing quote

For each leasing quote:

Question:
`¿Quieres comparar esta alternativa asumiendo que ejerces la opción de compra al final?`

Choices:
- `Sí, incluir la opción de compra al final`
- `No, modelar solo los cánones`

If the quote expresses purchase option only as a percentage, additionally ask:

`¿Sobre qué base está expresado ese porcentaje en la cotización?`

Choices:
- `Valor del inmueble`
- `Monto financiado`

Do not infer the base from provider wording.

### Step 3 — time-value assumption

Optional switch/question:

`¿Quieres comparar también el valor del dinero en el tiempo?`

If yes:

Input:
`Tasa anual de comparación (%)`

Microcopy:
`Es tu supuesto para valorar hoy desembolsos que ocurren en fechas distintas. No es la tasa del banco ni una recomendación de mercado.`

The field must not be auto-filled.

## 5. Primary action

CTA:
`Modelar este escenario`

Secondary:
`Volver a la base de cotizaciones`

Validation errors stay inside the scenario panel and never erase quote inputs.

## 6. Result hierarchy

### Result hero

Eyebrow:
`Resultado de escenario`

Title depends on status.

#### blocked
`Todavía falta una condición para modelar ambos flujos`

#### modeled_not_rankable
`Ya modelamos los flujos, pero no sería responsable rankearlos`

#### nominally_comparable
`Los desembolsos nominales ya están sobre una base comparable`

#### present_value_comparable
`También puedes comparar el valor presente de los desembolsos`

Always show:

`C1 declarado → C2 modelado · no verificado`

## 7. Quote cards

For each quote show:

- provider/label;
- structure and denomination;
- cash at closing;
- recurring modeled outflow total;
- external insurance total;
- purchase option outflow when applicable;
- nominal total modeled outflow;
- present-value outflow when the user supplied a discount rate;
- term;
- scenario assumptions affecting that quote.

Do not show a green/red winner treatment.

## 8. Comparable metric section

### Nominal metric

If comparable:

Heading:
`Menor desembolso nominal modelado bajo este escenario`

Show:

- quote label with lower modeled metric, unless tie;
- absolute modeled difference;
- the exact gate basis: same property, same financed amount, same term, equivalent full-acquisition path.

If not comparable:

Heading:
`No rankeamos el desembolso nominal`

Then list gate reasons such as:

- distinto monto financiado;
- distinto plazo;
- distinto valor del inmueble;
- leasing sin adquisición equivalente;
- one/both quote models blocked.

### Present value metric

Only show as a numeric metric when a comparison rate was supplied.

If comparable:

Heading:
`Menor valor presente de desembolsos bajo tu tasa de comparación`

Show exact annual comparison rate and modeled difference.

If discount rate is absent:

`No calculamos valor presente porque no definiste una tasa de comparación.`

If present values exist but cannot be ranked, list the relevant gate reason.

## 9. UVR sensitivity disclosure

If any UVR quote was modeled, display a dedicated scenario card:

`UVR usada en este escenario: X% anual`

Required copy:

`Es un supuesto elegido para esta simulación, no una proyección oficial. Si la UVR cambia, este resultado cambia.`

Never use words such as:

- expected;
- projected official;
- probable;
- forecast;

for the UVR assumption.

## 10. Mortgage vs leasing disclosure

If structures differ, retain a visible caveat even if a cost metric passes:

`El momento de adquisición y las características contractuales/jurídicas son distintas y no quedan reducidas a este indicador de flujo de caja.`

## 11. Language boundaries

Permitted:

- `diferencia modelada`;
- `menor desembolso modelado`;
- `bajo este escenario`;
- `valor presente bajo tu tasa de comparación`;
- `no rankeamos porque...`.

Prohibited:

- `ganador`;
- `mejor banco`;
- `mejor crédito`;
- `te ahorrarás`;
- `ahorro garantizado`;
- `te conviene más`;
- `aprobado`;
- `probabilidad de aprobación`.

## 12. Explainability

Add a collapsed `Cómo se construyó este escenario` details block containing:

1. month-zero cash comes from `totalCashRequiredAtClosing`;
2. one-time costs are not added again on top of that total;
3. peso constant-payment quotes use the declared payment/canon as the recurring base;
4. external declared insurance is added separately only when the quote says it is outside/partially outside the payment;
5. UVR-linked quotes use the user-selected sensitivity path;
6. leasing purchase option is included only under the user's explicit scenario choice;
7. present value exists only when the user supplies a comparison rate.

## 13. Editing behavior

Actions:

- `Cambiar supuestos` → returns to scenario form while preserving all inputs;
- `Editar cotización A` / `Editar cotización B` → returns to v0.18 edit state;
- editing a quote invalidates the displayed scenario result until the user models again.

No persistence is implied.

## 14. Anonymous-first

The scenario must not request:

- name;
- email;
- phone;
- ID;
- employer;
- account;
- bureau authorization.

## 15. Mobile

At 390 px:

- quote cards stack vertically;
- no horizontal table is required;
- metric values wrap without overflow;
- scenario choices remain tappable cards/radios;
- focus moves to the result heading after modeling;
- editing/back actions remain reachable after result content.

## 16. E2E acceptance

At minimum desktop + mobile must prove:

1. a same-basis peso pair can produce nominally comparable output;
2. different financed amounts show modeled totals but no nominal ranking;
3. adding a discount-rate assumption can enable PV comparison on same property basis;
4. an UVR pair/quote requires explicit UVR scenario and displays the sensitivity disclosure;
5. a leasing quote requires explicit exercise choice;
6. leasing without exercise blocks acquisition-equivalent ranking;
7. no result contains generic `ganador`, `mejor banco`, approval probability or guaranteed savings language;
8. changing assumptions does not erase quote inputs;
9. editing a quote returns to the existing v0.18 form;
10. no financial quote/scenario values are placed in the URL.
