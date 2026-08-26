# VIVIENDA

VIVIENDA es una plataforma colombiana de decisión y ejecución alrededor de vivienda y crédito.

Tesis de producto:

**Prepare → Buy → Finance → Manage → Optimize → Protect**

La cuña inicial es el usuario que ya tiene un crédito de vivienda y quiere entender si está pagando de la mejor manera disponible. El comprador potencial es la segunda ruta de adquisición.

## Estado actual

La línea de desarrollo está apilada y validada por slices. v0.10 y el slice funcional v0.11 quedaron verdes. El slice activo es:

**v0.12 — primera ruta asistida: Auditoría Hipotecaria R7**

Base v0.11:

`6dec13bc7ba35abc05020bcabfb60e7a10a6de7f`

Rama activa:

`product/mortgage-audit-assisted-v0.12`

## Superficies ejecutables

- `/` — Home Warm Path.
- `/revisar` — Quick Check anónimo.
- C1 → C2 — simulación modelada para el caso financiero soportado.
- `/verificar` — flujo de demostración para revisión/reconciliación documental.
- `/mi-vivienda` — Mortgage Twin + Loan Health V1 + precisión + siguientes acciones.
- `/auditoria-hipotecaria` — preview de la primera ruta asistida R7, sin contratación ni representación activa.

## Contrato de precisión

- **C0** — orientación.
- **C1** — estimación con datos declarados.
- **C2** — simulación modelada con supuestos suficientes.
- **C3** — verificado documentalmente.

C3 requiere evidencia realmente derivada de documento y reconciliación completa de campos materiales. Una confirmación manual o evidencia simulada no concede C3.

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

Aceptar el servicio:

- no concede facultad extrajudicial;
- no concede poder judicial;
- no crea una radicación;
- no garantiza ahorro, corrección ni resultado.

Si R10 aparece por proceso ejecutivo/embargo/remate, esa ruta domina y la auditoría R7 ordinaria debe re-rutearse.

## Arquitectura de dominio implementada

La cadena actual separa:

`Mortgage Twin → Opportunity Router → Loan Health → Assisted Execution → Case Plan → Case State → Persistence/Evidence Boundary → HTTP/Auth Boundary`

Incluye:

- motor financiero inicial con golden vectors;
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

En la conexión actual todavía no existe:

- proyecto Supabase propio de VIVIENDA;
- autenticación productiva;
- persistencia real de perfiles/casos/documentos;
- Storage live;
- OCR productivo;
- proyecto/deployment Vercel de VIVIENDA;
- bank adapters;
- Open Finance;
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
- `knowledge/40_DOMAIN/LOAN-HEALTH-CONTRACT-V0.11.md`
- `skills/housing-finance-design-orchestrator/SKILL.md`

La precedencia es: verdad jurídica/financiera → privacidad/seguridad → contratos de dominio → journey/UX → conversión → diseño → skills externas.
