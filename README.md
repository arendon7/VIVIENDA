# VIVIENDA

VIVIENDA es una plataforma colombiana de decisión y ejecución alrededor de vivienda y crédito.

Tesis de producto:

**Prepare → Buy → Finance → Manage → Optimize → Protect**

La cuña inicial sigue siendo el usuario que ya tiene un crédito de vivienda y quiere entender si está pagando de la mejor manera disponible. Las rutas públicas ya cubren comprador potencial y presión de pago sin desplazar esa cuña.

## Estado actual

Los slices v0.10–v0.13 quedaron verdes. El slice activo es:

**v0.14 — Journey 3 / Payment Pressure**

Base v0.13:

`1dd5ab2dba7d57911f3aee4f3f6fd11dcc401b64`

Rama activa:

`product/payment-pressure-v0.14`

## Superficies ejecutables

- `/` — Home Warm Path; existing borrower continúa como CTA primario.
- `/revisar` — Quick Check anónimo para crédito existente.
- `/verificar` — flujo de demostración para revisión/reconciliación documental.
- `/mi-vivienda` — Mortgage Twin + Loan Health V1 + precisión + siguientes acciones.
- `/auditoria-hipotecaria` — preview de la primera ruta asistida R7, sin contratación ni representación activa.
- `/comprar/cuanto-puedo-comprar` — Journey 2 C1→C2 para comprador potencial, sin identidad antes del primer valor.
- `/ayuda` — Journey 3 C0 para presión de pago, mora, cobranza y proceso judicial reportado.

## Contrato de precisión

- **C0** — orientación.
- **C1** — estimación con datos declarados.
- **C2** — simulación modelada con supuestos suficientes.
- **C3** — verificado documentalmente.

C3 requiere evidencia realmente derivada de documento y reconciliación completa de campos materiales. Una confirmación manual o evidencia simulada no concede C3.

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

### Conversión contextual

- prevención → sin CTA a abogado;
- mora/cobranza/prelegal → sin CTA a abogado;
- R7 → `/auditoria-hipotecaria`;
- R10 → `/verificar` primero;
- etapa desconocida → clasificar con extracto/comunicación.

El primer resultado no pide nombre, correo, teléfono, cédula ni documento.

## Buyer Affordability v0.13

C1 usa:

- ingreso neto mensual del hogar;
- cuotas recurrentes de otras deudas;
- cuota inicial disponible;
- VIS / no VIS / no sabe.

No pide nombre, correo, teléfono, cédula, score ni documentos.

v0.13 mantiene separados:

- **30%** — benchmark educativo de planificación sobre endeudamiento recurrente total e ingreso neto declarado;
- **40%** — techo regulatorio vigente de primera cuota sobre ingreso familiar acreditable;
- **70% no VIS / 80% VIS** — referencias máximas regulatorias de financiación/LTV.

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

No publica `76/100`, probabilidades de aprobación ni matching bancario porcentual.

## Auditoría Hipotecaria v0.12

La primera ruta asistida se activa únicamente cuando el Opportunity Router detecta una inconsistencia concreta R7.

Secuencia mínima:

`CASE_CREATED → DATA_AUTHORIZATION_RECORDED → SERVICE_AGREEMENT_ACCEPTED → EVIDENCE_REQUESTED → EVIDENCE_ATTACHED → EVIDENCE_VERIFIED → PROFESSIONAL_REVIEW_REQUESTED → PROFESSIONAL_REVIEW_COMPLETED`

Aceptar el servicio no concede facultad extrajudicial, poder judicial ni crea una radicación.

## Arquitectura de dominio implementada

La cadena separa:

`Buyer Affordability / Mortgage Twin / Payment Pressure → Opportunity Router → Loan Health → Assisted Execution → Case Plan → Case State → Persistence/Evidence Boundary → HTTP/Auth Boundary`

Incluye:

- motores financieros con golden vectors;
- buyer affordability v0.13;
- payment pressure triage v0.14;
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
- persistencia real de perfiles/casos/documentos;
- Storage/OCR live;
- proyecto/deployment Vercel de VIVIENDA;
- bank adapters;
- Open Finance;
- tasas de mercado automáticas;
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
- `knowledge/20_DESIGN/BUYER-AFFORDABILITY-UX-SPEC-V0.13.md`
- `knowledge/20_DESIGN/PAYMENT-PRESSURE-UX-SPEC-V0.14.md`
- `knowledge/40_DOMAIN/LOAN-HEALTH-CONTRACT-V0.11.md`
- `knowledge/40_DOMAIN/BUYER-AFFORDABILITY-CONTRACT-V0.13.md`
- `knowledge/40_DOMAIN/PAYMENT-PRESSURE-CONTRACT-V0.14.md`
- `skills/housing-finance-design-orchestrator/SKILL.md`

La precedencia es: verdad jurídica/financiera → privacidad/seguridad → contratos de dominio → journey/UX → conversión → diseño → skills externas.