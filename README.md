# VIVIENDA

VIVIENDA es una plataforma colombiana de decisión y ejecución alrededor de vivienda y crédito.

Tesis de producto:

**Prepare → Buy → Finance → Manage → Optimize → Protect**

La cuña inicial es el usuario que ya tiene un crédito de vivienda y quiere entender si está pagando de la mejor manera disponible. El comprador potencial es la segunda ruta de adquisición.

## Estado actual

La línea de desarrollo está apilada y validada por slices. v0.10 quedó verde y el slice activo es:

**v0.11 — Loan Health cualitativo dentro de Mi Vivienda**

Base v0.10:

`cff54e319f0a3255318184371d4e1f76d424325f`

Rama activa:

`product/loan-health-v0.11`

## Superficies ejecutables

- `/` — Home Warm Path.
- `/revisar` — Quick Check anónimo.
- C1 → C2 — simulación modelada para el caso financiero soportado.
- `/verificar` — flujo de demostración para revisión/reconciliación documental.
- `/mi-vivienda` — Mortgage Twin + Loan Health V1 + precisión + siguientes acciones.

## Contrato de precisión

- **C0** — orientación.
- **C1** — estimación con datos declarados.
- **C2** — simulación modelada con supuestos suficientes.
- **C3** — verificado documentalmente.

C3 requiere evidencia realmente derivada de documento y reconciliación completa de campos materiales. Una confirmación manual o evidencia simulada no concede C3.

## Loan Health V1

Loan Health v0.11 es una evaluación **cualitativa de decisiones**, no un score crediticio o de riesgo.

Dimensiones iniciales:

1. estructura del crédito;
2. prepago;
3. traslado / compra de cartera;
4. reestructuración anual;
5. consistencia / cobros;
6. mora / estado procesal.

Estados permitidos incluyen `ready`, `explore`, `needs_data`, `seasonal`, `attention`, `professional_review`, `no_flag_reported` y `not_applicable`.

No publica `76/100`, probabilidades de aprobación ni matching bancario porcentual.

## Arquitectura de dominio implementada

La cadena actual separa explícitamente:

`Mortgage Twin → Opportunity Router → Loan Health → Case Plan → Case State → Persistence/Evidence Boundary → HTTP/Auth Boundary`

Incluye:

- motor financiero inicial con golden vectors;
- provenance/trust contracts;
- Opportunity Router;
- Loan Health evaluator;
- Case Plan;
- Case State Machine append-only;
- Persistence & Identity Boundary;
- Supabase/Postgres adapter provider-ready;
- Storage/Auth Coordination provider-ready;
- Next Server API/Auth Wiring v0.9.

## Importante: provider-ready no significa live

En la conexión actual todavía no existe:

- proyecto Supabase propio de VIVIENDA;
- autenticación productiva;
- persistencia real de perfiles/casos/documentos;
- Storage live;
- OCR productivo;
- proyecto/deployment Vercel de VIVIENDA;
- bank adapters;
- Open Finance.

Por eso ninguna superficie puede afirmar guardado, sincronización, ofertas o aprobaciones que todavía no existen.

## Journeys canónicos

1. Existing borrower.
2. Prospective buyer.
3. Payment pressure.
4. Financial/legal inconsistency.
5. Education.

`Compra Segura` pertenece al dominio **Buy** y no reemplaza Journey 4.

## Desarrollo local

Requisitos:

- Node.js 22.12 o superior.

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
- `knowledge/00_PRODUCT/PRODUCT-INTEGRATION-V0.10.md`
- `knowledge/00_PRODUCT/STATUS-V0.11.md`
- `knowledge/40_DOMAIN/LOAN-HEALTH-CONTRACT-V0.11.md`
- `skills/housing-finance-design-orchestrator/SKILL.md`

La precedencia es: verdad jurídica/financiera → privacidad/seguridad → contratos de dominio → journey/UX → conversión → diseño → skills externas.
