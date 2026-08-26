# VIVIENDA

VIVIENDA es una plataforma colombiana de decisión y ejecución alrededor de vivienda y crédito.

Tesis de producto:

**Prepare → Buy → Finance → Manage → Optimize → Protect**

La cuña inicial es el usuario que ya tiene un crédito de vivienda y quiere entender si está pagando de la mejor manera disponible. El comprador potencial es la segunda ruta de adquisición.

## Estado actual

La línea de desarrollo está apilada y validada por slices desde foundation hasta v0.9. El slice activo es:

**v0.10 — Product Integration / Mi Vivienda + Mortgage Twin**

Base v0.9:

`ad4db678e4a8bc3aa15a90d794f56c8909f45d22`

Rama activa:

`product/product-integration-account-mortgage-twin-v0.10`

## Superficies ejecutables

- `/` — Home Warm Path.
- `/revisar` — Quick Check anónimo.
- C1 → C2 — simulación modelada para el caso financiero soportado.
- `/verificar` — flujo de demostración para revisión/reconciliación documental.
- `/mi-vivienda` — preview v0.10 del producto recurrente: Mortgage Twin, precisión, oportunidades y siguientes acciones.

## Contrato de precisión

- **C0** — orientación.
- **C1** — estimación con datos declarados.
- **C2** — simulación modelada con supuestos suficientes.
- **C3** — verificado documentalmente.

C3 requiere evidencia realmente derivada de documento y reconciliación completa de campos materiales. Una confirmación manual o evidencia simulada no concede C3.

## Arquitectura de dominio implementada

La cadena actual separa explícitamente:

`Mortgage Twin → Opportunity Router → Case Plan → Case State → Persistence/Evidence Boundary → HTTP/Auth Boundary`

Incluye:

- motor financiero inicial con golden vectors;
- provenance/trust contracts;
- Opportunity Router;
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

Por eso las superficies v0.10 no deben afirmar guardado, sincronización, scoring, ofertas o aprobaciones que todavía no existen.

## Scores

`Home Readiness Index` y `Loan Health` son conceptos del producto, pero **no tienen aún fórmula pública aprobada**.

No publicar porcentajes, `76/100`, probabilidades de aprobación o matching bancario hasta contar con contrato de dominio, metodología, test vectors y disclosure.

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
- `skills/housing-finance-design-orchestrator/SKILL.md`

La precedencia es: verdad jurídica/financiera → privacidad/seguridad → contratos de dominio → journey/UX → conversión → diseño → skills externas.
