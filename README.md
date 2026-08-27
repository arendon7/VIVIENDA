# VIVIENDA

VIVIENDA es una plataforma colombiana de decisión y ejecución alrededor de vivienda y crédito.

Tesis de producto:

**Prepare → Buy → Finance → Manage → Optimize → Protect**

La cuña inicial sigue siendo el usuario que ya tiene un crédito de vivienda y quiere entender si está pagando de la mejor manera disponible. Las rutas públicas ya cubren comprador potencial, preparación para compra, exploración de estructuras de financiación, normalización de cotizaciones, presión de pago e inconsistencias sin desplazar esa cuña.

## Estado actual

Los slices v0.10–v0.18 están desarrollados sobre una cadena versionada y reversible.

Último baseline de producto validado:

**v0.18 — Quote Normalization / Base Comparable de Cotizaciones**

Base v0.17 final:

`2b824629cb0efada86d766b44110a807db415f5e`

Green code/test head v0.18:

`598fad61ab3937151eedbc7edf94488fca160473`

Rama:

`product/quote-normalization-v0.18`

Gate del código v0.18:

- TypeScript: PASS;
- dominio: **321/321 PASS**;
- Quote Normalization: **37/37 PASS**;
- build: PASS;
- Playwright: **142/142 PASS** desktop + mobile 390 px.

v0.17 — Financing Structures Explorer — también quedó congelado y documentado antes de iniciar v0.18.

## Superficies ejecutables

- `/` — Home Warm Path; existing borrower continúa como CTA primario.
- `/revisar` — Quick Check anónimo para crédito existente.
- `/verificar` — flujo de demostración para revisión/reconciliación documental.
- `/mi-vivienda` — Mortgage Twin + Loan Health V1 + precisión + siguientes acciones.
- `/auditoria-hipotecaria` — preview de la primera ruta asistida R7, sin contratación ni representación activa.
- `/comprar/cuanto-puedo-comprar` — Journey 2 C1→C2 para comprador potencial, sin identidad antes del primer valor.
- `/comprar/preparacion` — Home Readiness: perfil parcial → cinco dimensiones → índice completo cuando hay información suficiente.
- `/comprar/financiacion` — explorador anónimo de estructura contractual y denominación antes de comparar entidades u ofertas reales.
- `/comprar/comparar-cotizaciones` — normalización manual C1 de una o dos cotizaciones para detectar faltantes, consistencia y diferencias de base antes de cualquier comparación económica.
- `/ayuda` — Journey 3 C0 para presión de pago, mora, cobranza y proceso judicial reportado.
- `/revisar-diferencia` — Journey 4 C0 para aislar y reconciliar una diferencia declarada sin presumir error o ilegalidad.

## Contrato de precisión

- **C0** — orientación.
- **C1** — estimación con datos declarados.
- **C2** — simulación modelada con supuestos suficientes.
- **C3** — verificado documentalmente.

C3 requiere evidencia realmente derivada de documento y reconciliación completa de campos materiales. Una confirmación manual o evidencia simulada no concede C3.

## Quote Normalization v0.18

v0.18 incorpora una capa previa a cualquier comparación económica de ofertas reales.

Pregunta de producto:

> **¿Estas cotizaciones contienen suficiente información y están sobre bases comparables?**

No intenta responder todavía cuál cotización gana.

### Estados de una cotización

- `incomplete` — faltan campos estructurales;
- `structurally_ready` — la estructura ya puede entenderse, pero faltan datos materiales;
- `comparison_input_ready` — la entrada declarada está materialmente completa para alimentar un futuro modelo económico.

`comparison_input_ready` es un estado de preparación de datos. No significa:

- mejor;
- más barata;
- recomendada;
- verificada;
- elegible;
- preaprobada;
- aprobada;
- probable de aprobar.

No existe porcentaje artificial de completitud.

### Estados de un par de cotizaciones

- `blocked_by_missing_data`;
- `ready_for_structural_comparison`;
- `ready_for_future_economic_model`.

El último estado tampoco ejecuta una comparación económica. Solo confirma que ambas entradas tienen la materialidad declarada requerida para una capa posterior.

### Qué normaliza

El motor conserva y distingue:

- entidad/proveedor y fecha/vigencia;
- crédito hipotecario vs. leasing habitacional;
- pesos vs. UVR;
- valor del inmueble;
- monto y porcentaje financiado;
- plazo;
- tasa y convención;
- comportamiento de amortización/canon;
- seguros;
- costos de una sola vez;
- efectivo total requerido al cierre;
- prepago;
- referencia UVR cuando aplica;
- economía y momento de la opción de compra del leasing.

Puede derivar mecánicamente el porcentaje financiado desde valor del inmueble y monto financiado, pero lo identifica como derivado de datos declarados y no como dato verificado.

### Diferencias de base

Al ingresar dos cotizaciones, v0.18 puede revelar diferencias de:

- estructura;
- denominación;
- monto/equity;
- porcentaje financiado;
- plazo;
- convención de tasa;
- amortización;
- seguros;
- efectivo al cierre;
- opción de compra del leasing;
- fecha/vigencia.

El resultado se presenta bajo la idea:

> **Ahora sabemos qué no es directamente comparable.**

### Requisitos para una futura modelación

El motor puede exigir, según el par:

- trayectoria UVR o cronograma verificado;
- economía de opción de compra del leasing;
- normalización de convenciones de tasa;
- normalización de seguros;
- normalización de costos iniciales;
- normalización de monto financiado/equity;
- plazo común o varios horizontes;
- alineación de vigencia de ofertas.

v0.18 no calcula:

- costo total;
- valor presente;
- ahorro;
- ganador;
- ranking de entidad;
- matching bancario;
- elegibilidad;
- aprobación.

La ruta es manual, anónima y C1. No requiere identidad, cuenta, consulta de centrales ni documentos; tampoco finge OCR, verificación o persistencia.

## Financing Structures Explorer v0.17

Journey 2 Step 7 separa dos ejes que no deben confundirse:

### Estructura contractual

- crédito hipotecario;
- leasing habitacional.

### Denominación / comportamiento

- pesos;
- UVR.

El explorador usa dos preferencias declaradas para ordenar alternativas como:

- **Explorar primero**;
- **Mantener para comparar**;
- **Comparar después**;
- **Falta definir preferencia**.

Ese orden expresa alineación con la preferencia del usuario. No es:

- elegibilidad;
- preaprobación;
- aprobación;
- probabilidad de aprobación;
- matching bancario;
- ranking de entidades;
- cotización de mercado;
- ranking de costo.

Reglas importantes:

- aceptar leasing no convierte leasing automáticamente en ganador;
- aceptar variación UVR no convierte UVR automáticamente en ganador;
- una preferencia desconocida no fabrica un ganador;
- no se insertan bancos ni tasas actuales;
- no se supone que leasing financia un porcentaje mayor;
- el usuario obtiene orientación y checklist de cotización sin entregar identidad ni consultar centrales.

La ruta `/comprar/preparacion` expone navegación a `/comprar/financiacion` sin serializar montos financieros en la URL. El componente de financiación admite un `initialConstraintContext` derivado para una futura continuidad in-memory, pero v0.17 no finge persistencia ni transfiere ese contexto entre rutas autónomas.

`/comprar/financiacion` enlaza ahora a `/comprar/comparar-cotizaciones` como siguiente capa cuando el usuario ya tiene ofertas para revisar. No se transfieren montos por URL.

## Home Readiness v0.16

El **Índice de Preparación Hipotecaria** es una herramienta explicable de planificación, no un score bancario.

Cinco dimensiones de hasta 20 puntos:

1. carga actual de obligaciones;
2. preparación de cuota inicial;
3. continuidad de ingresos;
4. preparación documental;
5. encaje del objetivo.

Principios:

- no es DataCrédito, bureau score, bank score, preaprobación, aprobación ni probabilidad de aprobación;
- no inserta una tasa de mercado;
- para modelar `target_fit`, tasa y plazo deben ser suministrados por el usuario;
- empleo independiente/empleado no se puntúa por sí mismo; se evalúa continuidad/historia;
- si falta una dimensión, no se normalizan las demás para fabricar un 0–100;
- el usuario puede obtener el resultado sustantivo sin nombre, correo, teléfono, cédula ni cuenta.

Home Readiness reutiliza Buyer Affordability en vez de duplicar sus fórmulas. Desde `/comprar/cuanto-puedo-comprar`, `Conocer mi preparación` conserva en memoria ingreso, deudas, inicial, categoría y, si existe, el escenario C2 suministrado por el usuario. No serializa datos financieros en la URL y no finge persistencia.

## Inconsistency Reconciler v0.15

`/revisar-diferencia` ayuda a separar:

- qué esperaba/comunicaba una fuente;
- qué aparece aplicado/observado en otra;
- qué evidencia falta para comparar;
- cuándo solo hace falta educación/clasificación;
- cuándo existe una diferencia compatible con R7;
- cuándo un proceso judicial reportado hace prioritario R10.

Dos fuentes declaradas siguen siendo C0 hasta que exista procesamiento y reconciliación documental real.

El flujo no concluye automáticamente:

- error bancario;
- ilegalidad;
- fraude;
- derecho a devolución;
- estrategia procesal.

## Payment Pressure v0.14

`/ayuda` separa cinco estados de urgencia cualitativos:

- Prevención;
- Actuar pronto;
- Revisar una diferencia;
- Revisión prioritaria;
- Falta ubicar la etapa.

No existe score numérico de riesgo.

### Cobranza ≠ proceso judicial

`early_arrears`, `collections` y `prelegal` no se transforman en urgencia procesal.

La ruta solo activa `procedural_urgency` cuando el usuario reporta expresamente:

- proceso ejecutivo; o
- embargo/remate/actuación avanzada.

No calcula términos procesales ni estrategia desde fechas declaradas.

### Reuso de verdad jurídica

El triage no replica Ley 546. Reutiliza el `Opportunity Router` existente:

- R3 puede aparecer para crédito hipotecario + cambio económico bajo sus reglas actuales;
- R7 aparece solo ante inconsistencia explícita;
- R10 domina cuando hay proceso judicial/embargo reportado;
- leasing no hereda automáticamente rutas hipotecarias.

## Buyer Affordability v0.13

C1 usa:

- ingreso neto mensual del hogar;
- cuotas recurrentes de otras deudas;
- cuota inicial disponible;
- VIS / no VIS / no sabe.

No pide nombre, correo, teléfono, cédula, score ni documentos.

v0.13 mantiene separados:

- **30%** — benchmark educativo de planificación sobre endeudamiento recurrente total e ingreso neto declarado;
- **40%** — techo regulatorio de primera cuota según la referencia congelada del slice;
- **70% no VIS / 80% VIS** — referencias regulatorias de financiación/LTV congeladas en la metodología del slice.

C2 solo usa una tasa EA y plazo suministrados por el usuario; no existe tasa de mercado automática.

Invariante de precio:

```text
propertyCeilingFromCreditAndCash = modeledPrincipal + availableDownPayment
propertyCeilingFromDownPayment = availableDownPayment / (1 - maxLtv)
modeledPropertyCeiling = min(propertyCeilingFromCreditAndCash, propertyCeilingFromDownPayment)
```

## Loan Health V1

Loan Health es una evaluación **cualitativa de decisiones**, no un score crediticio o de riesgo.

Dimensiones:

1. estructura del crédito;
2. prepago;
3. traslado / compra de cartera;
4. reestructuración anual;
5. consistencia / cobros;
6. mora / estado procesal.

No publica probabilidades de aprobación ni matching bancario porcentual.

## Auditoría Hipotecaria v0.12

La primera ruta asistida se activa únicamente cuando el Opportunity Router detecta una inconsistencia concreta R7.

Secuencia mínima:

`CASE_CREATED → DATA_AUTHORIZATION_RECORDED → SERVICE_AGREEMENT_ACCEPTED → EVIDENCE_REQUESTED → EVIDENCE_ATTACHED → EVIDENCE_VERIFIED → PROFESSIONAL_REVIEW_REQUESTED → PROFESSIONAL_REVIEW_COMPLETED`

Aceptar el servicio no concede facultad extrajudicial, poder judicial ni crea una radicación.

## Arquitectura de dominio implementada

La cadena separa:

`Buyer Affordability / Home Readiness / Financing Structures / Quote Normalization / Mortgage Twin / Payment Pressure / Inconsistency Reconciliation → Opportunity Router → Loan Health → Assisted Execution → Case Plan → Case State → Persistence/Evidence Boundary → HTTP/Auth Boundary`

Incluye:

- motores financieros con golden vectors;
- Buyer Affordability v0.13;
- Payment Pressure v0.14;
- Inconsistency Reconciler v0.15;
- Home Readiness v0.16;
- Financing Structures Explorer v0.17;
- Quote Normalization v0.18;
- provenance/trust contracts;
- Opportunity Router;
- Loan Health evaluator;
- Mortgage Audit R7 blueprint;
- Case Plan;
- Case State Machine append-only;
- Persistence & Identity Boundary;
- Supabase/Postgres adapter provider-ready;
- Storage/Auth Coordination provider-ready;
- Next Server API/Auth Wiring v0.9.

## Provider-ready no significa live

Todavía no existe:

- proyecto Supabase propio de VIVIENDA;
- autenticación productiva;
- persistencia real de perfiles/casos/documentos/cotizaciones;
- Storage/OCR live;
- proyecto/deployment Vercel de VIVIENDA;
- bureau integrations;
- bank adapters/matching;
- Open Finance;
- tasas de mercado automáticas;
- live lender offers;
- OCR/verificación de cotizaciones;
- comparación económica de cotizaciones;
- cálculo de ahorro/ganador;
- subsidy eligibility live;
- application/approval flows;
- pagos/contratación productiva.

## Journeys canónicos

1. Existing borrower.
2. Prospective buyer.
3. Payment pressure.
4. Financial/legal inconsistency.
5. Education.

`Compra Segura` pertenece al dominio **Buy** y no reemplaza Journey 4.

## Desarrollo local

Requisitos: Node.js 22.12 o superior.

```bash
npm ci
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Playwright valida desktop y viewport móvil de 390 px contra build de producción en CI.

## Canon

Leer antes de cambios sustanciales:

- `AGENTS.md`
- `PRODUCT.md`
- `knowledge/00_PRODUCT/MVP-SCOPE.md`
- `knowledge/00_PRODUCT/JOURNEY-MAP.md`
- `knowledge/00_PRODUCT/INFORMATION-ARCHITECTURE.md`
- `knowledge/00_PRODUCT/STATUS-V0.10.md`
- `knowledge/00_PRODUCT/STATUS-V0.11.md`
- `knowledge/00_PRODUCT/MORTGAGE-AUDIT-ASSISTED-V0.12.md`
- `knowledge/00_PRODUCT/STATUS-V0.12.md`
- `knowledge/00_PRODUCT/STATUS-V0.13.md`
- `knowledge/00_PRODUCT/STATUS-V0.14.md`
- `knowledge/00_PRODUCT/STATUS-V0.15.md`
- `knowledge/00_PRODUCT/STATUS-V0.16.md`
- `knowledge/00_PRODUCT/STATUS-V0.17.md`
- `knowledge/00_PRODUCT/STATUS-V0.18.md`
- `knowledge/20_DESIGN/BUYER-AFFORDABILITY-UX-SPEC-V0.13.md`
- `knowledge/20_DESIGN/PAYMENT-PRESSURE-UX-SPEC-V0.14.md`
- `knowledge/20_DESIGN/HOME-READINESS-UX-SPEC-V0.16.md`
- `knowledge/20_DESIGN/FINANCING-STRUCTURES-UX-SPEC-V0.17.md`
- `knowledge/20_DESIGN/QUOTE-NORMALIZATION-UX-SPEC-V0.18.md`
- `knowledge/40_DOMAIN/LOAN-HEALTH-CONTRACT-V0.11.md`
- `knowledge/40_DOMAIN/BUYER-AFFORDABILITY-CONTRACT-V0.13.md`
- `knowledge/40_DOMAIN/PAYMENT-PRESSURE-CONTRACT-V0.14.md`
- `knowledge/40_DOMAIN/HOME-READINESS-CONTRACT-V0.16.md`
- `knowledge/40_DOMAIN/FINANCING-STRUCTURES-CONTRACT-V0.17.md`
- `knowledge/40_DOMAIN/QUOTE-NORMALIZATION-CONTRACT-V0.18.md`
- `skills/housing-finance-design-orchestrator/SKILL.md`

La precedencia es: verdad jurídica/financiera → privacidad/seguridad → contratos de dominio → journey/UX → conversión → diseño → skills externas.