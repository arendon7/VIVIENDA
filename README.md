# VIVIENDA

VIVIENDA es una plataforma colombiana de decisión y ejecución alrededor de vivienda y crédito.

Tesis de producto:

**Prepare → Buy → Finance → Manage → Optimize → Protect**

La cuña inicial sigue siendo el usuario que ya tiene un crédito de vivienda y quiere entender si está pagando de la mejor manera disponible. Las rutas públicas ya cubren comprador potencial, preparación para compra, exploración de estructuras de financiación, normalización y modelación económica de cotizaciones, presión de pago e inconsistencias sin desplazar esa cuña.

## Estado actual

Los slices v0.10–v0.21 están desarrollados sobre una cadena versionada y reversible.

Último baseline funcional validado:

**v0.21 — Loan Health Integration**

Freeze base heredado v0.20:

`0800f7b41b8ee579375beed9c86ee97f2fd161cb`

Green code/test head v0.21:

`02b58824ccd99cafc149a3f8c35222414416abb5`

Rama:

`product/loan-health-integration-v0.21`

Gate del código v0.21:

- TypeScript: PASS;
- dominio: **391/391 PASS** en 29 archivos;
- Loan Health evaluator: **11 PASS**;
- Loan Health integration layer: **8 PASS**;
- build: PASS;
- Playwright: **168/168 PASS** desktop + mobile 390 px.

v0.20 — Statement-Guided Mortgage Twin — permanece congelado como baseline heredado. v0.21 integra Loan Health dentro del journey real del existing borrower y hace explícita la precisión por decisión sin elevar artificialmente el Mortgage Twin completo.

## Superficies ejecutables

- `/` — Home Warm Path; existing borrower continúa como CTA primario.
- `/revisar` — Quick Check anónimo para crédito existente.
- `/verificar` — Statement-Guided Mortgage Twin: el usuario usa un extracto local como referencia, transcribe campos, puede construir un modelo C2 compatible y continuar a Loan Health + rutas sin que el archivo se suba, lea o conceda C3.
- `/mi-vivienda` — Mortgage Twin + Loan Health V1 + precisión + siguientes acciones.
- `/auditoria-hipotecaria` — preview de la primera ruta asistida R7, sin contratación ni representación activa.
- `/comprar/cuanto-puedo-comprar` — Journey 2 C1→C2 para comprador potencial, sin identidad antes del primer valor.
- `/comprar/preparacion` — Home Readiness: perfil parcial → cinco dimensiones → índice completo cuando hay información suficiente.
- `/comprar/financiacion` — explorador anónimo de estructura contractual y denominación antes de comparar entidades u ofertas reales.
- `/comprar/comparar-cotizaciones` — normalización manual C1 de una o dos cotizaciones y, cuando ambas están materialmente listas, modelación económica C2 bajo supuestos explícitos; no es ranking bancario ni recomendación.
- `/ayuda` — Journey 3 C0 para presión de pago, mora, cobranza y proceso judicial reportado.
- `/revisar-diferencia` — Journey 4 C0 para aislar y reconciliar una diferencia declarada sin presumir error o ilegalidad.

## Contrato de precisión

- **C0** — orientación.
- **C1** — estimación con datos declarados.
- **C2** — simulación modelada con supuestos suficientes.
- **C3** — verificado documentalmente.

C3 requiere evidencia realmente derivada de documento y reconciliación completa de campos materiales. Una confirmación manual, transcripción desde un archivo local o evidencia simulada no concede C3.

## Loan Health Integration v0.21

v0.21 coloca Loan Health dentro del journey real del existing borrower: después de construir la fotografía del crédito y antes de pedir al usuario que seleccione una ruta de ejecución.

Pregunta de producto:

> **¿Cuál es el estado actual de decisión de este Mortgage Twin real aportado por el usuario, y qué ruta específica sí alcanzó una precisión superior mediante un modelo realmente construido?**

Secuencia:

`Quick Check C1 → Statement-Guided Mortgage Twin C1 → modelo compatible C2 → Opportunity Workspace → Loan Health → selección de ruta → Case Plan`

Regla central:

> **La precisión pertenece a la decisión que la ganó: una ruta C2 no convierte el Mortgage Twin completo ni las demás rutas en C2/C3.**

En el slice actual:

- la fuente base del Mortgage Twin permanece C1;
- Loan Health conserva C1 como evaluación de esa fuente base;
- `R1_PREPAGO_PLAZO` puede alcanzar C2 solo cuando existe un escenario compatible realmente modelado y todavía vinculado a los mismos inputs;
- R2/R3/R5/R7/R10 permanecen C1 salvo que cada una gane por separado una precisión superior en un slice futuro;
- ninguna ruta recibe C3.

El escenario R1 C2 se invalida fail-closed cuando cambian inputs materiales. Al invalidarse, desaparece `R1 · C2 modelado`, R1 vuelve a C1 y Loan Health deja de tratar Prepago como una decisión ya modelada.

Loan Health sigue siendo cualitativo: no es score bancario, score crediticio, porcentaje de salud ni probabilidad de aprobación. La precedencia de decisión mantiene revisión profesional y alertas materiales por encima de optimizaciones ordinarias.

El CTA actual desde Mortgage Twin es `Ver mi Loan Health y rutas`. El workspace reutiliza producto, modalidad y monto de prepago ya conocidos para no repetir preguntas ni degradar contexto confiable a `unknown`.

v0.21 no activa C3 documental, OCR, persistencia productiva, autenticación productiva, tasas de mercado automáticas, centrales, Open Finance, conectividad bancaria, matching real, ofertas live, aprobación, probabilidad de aprobación, ahorro garantizado ni conclusión jurídica automática.

## Statement-Guided Mortgage Twin v0.20

v0.20 reemplaza la antigua demo documental de `/verificar` por un journey de valor real que preserva la frontera de evidencia.

Pregunta de producto:

> **¿Puede una persona usar un extracto reciente como referencia local para construir una fotografía materialmente mejor de su crédito sin que VIVIENDA finja haber subido, leído, extraído o verificado ese documento?**

Secuencia:

`Quick Check C1 → extracto local como referencia → Mortgage Twin C1 → modelo C2 compatible → Opportunity Router / Case Plan`

C3 queda reservado para evidencia realmente derivada del documento y reconciliada.

### Archivo local y provenance

El usuario puede seleccionar localmente PDF/JPG/PNG de hasta 15 MiB como referencia de conveniencia y mirar el documento mientras transcribe campos.

v0.20 no envía el archivo al servidor, no llama OCR y no simula upload exitoso.

Los campos transcritos conservan:

- `sourceType = user_declared`;
- `acquisitionMethod = user_transcribed_from_local_statement`;
- `documentReadByPlatform = false`;
- `userConfirmed = true`.

El filename es UI efímera: no entra al snapshot canónico, URL ni analytics genéricos.

### Snapshot C1

Para `snapshot_ready` se requieren:

- tipo de producto;
- fecha de corte;
- modalidad pesos / UVR;
- saldo de capital válido.

Campos de contexto como entidad, pago reciente y seguros/costos pueden enriquecer el snapshot, pero un contexto opcional inválido no bloquea una base materialmente válida.

### Modelo C2 compatible

El primer handoff modelable exige:

- crédito hipotecario de vivienda;
- pesos;
- saldo válido;
- tasa EA explícita válida;
- cuotas restantes positivas;
- `constant_payment_pesos`.

Reglas congeladas:

- UVR no hereda el modelo de pesos;
- leasing habitacional no hereda el modelo de prepago hipotecario;
- una tasa ambigua no se convierte silenciosamente a EA;
- un bloqueo de modelo no degrada un snapshot C1 válido.

### Mortgage Twin y decisiones downstream

Mortgage Twin distingue explícitamente:

- `declared` → C1;
- `preview` → C2;
- `verified` → C3.

Después del snapshot C1, `Explorar mis próximas decisiones` conserva producto/modalidad conocidos al entrar al Opportunity Router. La sustitución de la demo no elimina Case Plan ni obliga a repetir información ya capturada.

### Fronteras

v0.20 no hace:

- server upload;
- persistencia productiva;
- OCR/extracción;
- documento → C3;
- autenticación productiva;
- provider activation;
- conectividad bancaria;
- Open Finance;
- consulta de centrales;
- matching de compra de cartera;
- recomendación de banco/producto;
- elegibilidad, preaprobación o aprobación;
- probabilidad de aprobación;
- ahorro garantizado;
- conclusión legal automática.

Regla central:

> **Un documento local puede guiar al usuario sin convertirse en evidencia que VIVIENDA afirme haber leído.**

## Scenario-Based Economic Quote Comparison v0.19

v0.19 toma dos cotizaciones que ya pasaron Quote Normalization v0.18 y construye flujos C2 bajo supuestos explícitos.

Pregunta de producto:

> **Bajo estos datos declarados y estos supuestos explícitos, ¿cómo se ven los flujos económicos y qué métricas pueden compararse responsablemente?**

La regla central es:

> **diferencia modelada bajo un escenario ≠ ahorro garantizado ≠ mejor financiación**

### Entrada y continuidad

- las cotizaciones siguen siendo C1 `user_declared` y no verificadas;
- el escenario resultante es C2;
- el CTA `Modelar escenario económico` aparece solo cuando v0.18 devuelve `ready_for_future_economic_model`;
- v0.19 reutiliza los dos `FinancingQuoteInput` en memoria;
- no crea una ruta paralela;
- no serializa montos o cotizaciones en URL;
- editar una cotización invalida el escenario mostrado.

### Flujos soportados

Según la cotización y el escenario, el motor puede incluir:

- efectivo total requerido al cierre;
- cuotas o cánones recurrentes;
- seguros declarados por fuera de la cuota/canon;
- opción de compra del leasing cuando se incorpora explícitamente;
- trayectoria UVR de sensibilidad suministrada por el usuario;
- valor presente cuando el usuario define una tasa anual de comparación.

Para pesos con `constant_nominal_payment`, la base recurrente es la cuota/canon declarada. v0.19 no reconstruye silenciosamente una cuota bancaria desde tasa, monto y plazo.

Los costos de una sola vez no se vuelven a sumar sobre `totalCashRequiredAtClosing` cuando ese total ya los comprende.

### UVR

v0.19 no predice UVR.

Una cotización UVR solo se modela en pesos cuando el usuario suministra una trayectoria explícita de sensibilidad. La UI la presenta como supuesto, no como proyección oficial, esperada o probable.

### Leasing

La opción de compra no se omite silenciosamente. Si el usuario quiere modelar adquisición completa, debe decidir explícitamente su ejercicio; cuando la opción es porcentual y la base no queda determinada, debe declarar la base.

Crédito hipotecario y leasing no se convierten en equivalentes jurídicos porque una métrica de flujo sea menor.

### Métricas y gates

El motor separa:

1. modelabilidad de cada cotización;
2. modelabilidad de ambas;
3. comparabilidad responsable de una métrica concreta.

Puede mostrar:

- desembolso nominal modelado;
- menor desembolso nominal modelado, solo si pasan sus gates;
- valor presente modelado cuando existe tasa de comparación;
- menor valor presente modelado, solo si pasan sus gates.

Puede negarse a rankear por:

- cotización no modelable;
- valor del inmueble distinto;
- monto financiado distinto;
- plazo distinto;
- falta de tasa de comparación para la métrica que la exige;
- adquisición final no equivalente.

La salida permitida es una propiedad de la métrica bajo el escenario, nunca un `mejor banco`, `mejor crédito`, elegibilidad o aprobación.

### Fronteras

v0.19 no hace:

- verificación documental;
- OCR;
- persistencia;
- consulta de centrales;
- integración bancaria;
- Open Finance;
- matching bancario;
- preaprobación o aprobación;
- probabilidad de aprobación;
- recomendación de producto;
- predicción UVR;
- ahorro garantizado;
- conclusión legal automática.

## Quote Normalization v0.18

v0.18 incorpora una capa previa a cualquier comparación económica de ofertas reales.

Pregunta de producto:

> **¿Estas cotizaciones contienen suficiente información y están sobre bases comparables?**

No intenta responder por sí sola cuál cotización tiene menor costo.

### Estados de una cotización

- `incomplete` — faltan campos estructurales;
- `structurally_ready` — la estructura ya puede entenderse, pero faltan datos materiales;
- `comparison_input_ready` — la entrada declarada está materialmente completa para alimentar un modelo económico.

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

El último estado no ejecuta por sí mismo una comparación económica. Solo habilita la capa v0.19.

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

`/comprar/financiacion` enlaza a `/comprar/comparar-cotizaciones` como siguiente capa cuando el usuario ya tiene ofertas para revisar. No se transfieren montos por URL.

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

`Buyer Affordability / Home Readiness / Financing Structures / Quote Normalization / Economic Quote Comparison / Statement-Guided Intake / Mortgage Twin / Payment Pressure / Inconsistency Reconciliation → Opportunity Router → Loan Health → Assisted Execution → Case Plan → Case State → Persistence/Evidence Boundary → HTTP/Auth Boundary`

Incluye:

- motores financieros con golden vectors;
- Buyer Affordability v0.13;
- Payment Pressure v0.14;
- Inconsistency Reconciler v0.15;
- Home Readiness v0.16;
- Financing Structures Explorer v0.17;
- Quote Normalization v0.18;
- Scenario-Based Economic Quote Comparison v0.19;
- Statement-Guided Mortgage Twin v0.20;
- Loan Health Integration v0.21;
- provenance/trust contracts;
- Opportunity Router;
- Loan Health evaluator;
- Loan Health integration layer;
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
- comparación económica basada en ofertas verificadas o datos live de entidades;
- ranking bancario o recomendación de entidad/producto;
- ahorro garantizado o ganador genérico;
- subsidy eligibility live;
- application/approval flows;
- pagos/contratación productiva.

El selector local de extracto de v0.20 no contradice esta lista: funciona únicamente como referencia cliente para transcripción manual y no constituye Storage/OCR live.

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
- `knowledge/00_PRODUCT/STATUS-V0.19.md`
- `knowledge/00_PRODUCT/STATUS-V0.20.md`
- `knowledge/00_PRODUCT/STATUS-V0.21.md`
- `knowledge/20_DESIGN/BUYER-AFFORDABILITY-UX-SPEC-V0.13.md`
- `knowledge/20_DESIGN/PAYMENT-PRESSURE-UX-SPEC-V0.14.md`
- `knowledge/20_DESIGN/HOME-READINESS-UX-SPEC-V0.16.md`
- `knowledge/20_DESIGN/FINANCING-STRUCTURES-UX-SPEC-V0.17.md`
- `knowledge/20_DESIGN/QUOTE-NORMALIZATION-UX-SPEC-V0.18.md`
- `knowledge/20_UX/ECONOMIC-QUOTE-COMPARISON-UX-SPEC-V0.19.md`
- `knowledge/20_UX/STATEMENT-GUIDED-MORTGAGE-TWIN-UX-SPEC-V0.20.md`
- `knowledge/20_UX/LOAN-HEALTH-INTEGRATION-UX-SPEC-V0.21.md`
- `knowledge/40_DOMAIN/LOAN-HEALTH-CONTRACT-V0.11.md`
- `knowledge/40_DOMAIN/BUYER-AFFORDABILITY-CONTRACT-V0.13.md`
- `knowledge/40_DOMAIN/PAYMENT-PRESSURE-CONTRACT-V0.14.md`
- `knowledge/40_DOMAIN/HOME-READINESS-CONTRACT-V0.16.md`
- `knowledge/40_DOMAIN/FINANCING-STRUCTURES-CONTRACT-V0.17.md`
- `knowledge/40_DOMAIN/QUOTE-NORMALIZATION-CONTRACT-V0.18.md`
- `knowledge/40_DOMAIN/ECONOMIC-QUOTE-COMPARISON-CONTRACT-V0.19.md`
- `knowledge/40_DOMAIN/STATEMENT-GUIDED-MORTGAGE-TWIN-CONTRACT-V0.20.md`
- `knowledge/40_DOMAIN/LOAN-HEALTH-INTEGRATION-CONTRACT-V0.21.md`
- `skills/housing-finance-design-orchestrator/SKILL.md`

La precedencia es: verdad jurídica/financiera → privacidad/seguridad → contratos de dominio → journey/UX → conversión → diseño → skills externas.