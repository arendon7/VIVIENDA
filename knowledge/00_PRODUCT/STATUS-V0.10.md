# VIVIENDA — Estado de producto v0.10

Date: 2026-08-26
Status: active product-integration slice
Base: `ad4db678e4a8bc3aa15a90d794f56c8909f45d22` (v0.9)

## Resumen ejecutivo

VIVIENDA conserva como tesis canónica una plataforma colombiana de decisión y ejecución alrededor de vivienda y crédito:

**Prepare → Buy → Finance → Manage → Optimize → Protect**.

La cuña inicial sigue siendo el usuario que ya tiene crédito de vivienda. El comprador potencial es la segunda ruta de adquisición.

La implementación llegó a una base técnica profunda —Opportunity Router, Case Plan, Case State, persistencia, coordinación de evidencia y frontera HTTP— antes de materializar por completo el producto autenticado visible. v0.10 corrige ese desbalance.

## Taxonomía canónica de journeys

1. **Existing borrower** — “¿Estoy pagando este crédito de la mejor manera?”
2. **Prospective buyer** — “¿Qué vivienda puedo comprar de forma sostenible?”
3. **Payment pressure** — “Mi cuota se está volviendo imposible.”
4. **Financial/legal inconsistency** — “Algo no cuadra en mi crédito.”
5. **Education** — “Solo quiero entender.”

`Compra Segura` es una capacidad del dominio **Buy**; no reemplaza Journey 4.

## Implementado y validado hasta v0.9

- Home Warm Path.
- `/revisar` Quick Check anónimo.
- estados de precisión C0–C3.
- simulación C2 limitada y testeada para crédito en pesos/cuota constante.
- `/verificar` como demostración local de revisión documental.
- reconciliación de campos materiales.
- Mortgage Twin preview.
- Opportunity Router.
- Case Plan.
- Case State Machine append-only.
- Persistence & Identity Boundary.
- Supabase/Postgres adapter provider-ready.
- Storage/Auth Coordination provider-ready.
- Next Server API/Auth Wiring Boundary v0.9.
- CI verde con typecheck, domain tests, build y E2E.

## No está activo en producción

- proyecto Supabase propio de VIVIENDA;
- autenticación real;
- persistencia real de perfiles/casos/documentos;
- Storage live;
- OCR productivo;
- Vercel project/deployment de VIVIENDA en la conexión actual;
- score numérico Home Readiness/Loan Health validado;
- bank adapters o matching real;
- Open Finance;
- marketplace financiero;
- pagos/honorarios productivos.

## Regla de v0.10

No abrir más infraestructura horizontal antes de convertir la base existente en un producto visible coherente.

Prioridad:

1. `Mi Vivienda` shell y jerarquía del producto autenticado.
2. Mortgage Twin como estado actual del crédito.
3. Opportunities como siguientes acciones explicables.
4. separación C1/C2/C3 y provenance en dashboard.
5. Account/Profile real cuando exista proveedor autenticado.
6. una ruta de ejecución asistida probada antes de ampliar workflows.

## Scores e indicadores

`Home Readiness Index` y `Loan Health` siguen siendo conceptos de producto, no fórmulas aprobadas.

Hasta existir contrato de dominio, metodología, test vectors y lenguaje de disclosure:

- no publicar `76/100`;
- no publicar probabilidades de aprobación;
- no publicar “compatibilidad 89%” con una entidad;
- usar dimensiones explicables y estados cualitativos respaldados por datos disponibles.

## Orden posterior recomendado

1. v0.10 — Product Integration / Mi Vivienda + Mortgage Twin.
2. Loan Health V1 con contrato propio.
3. una ejecución real de optimización/auditoría hipotecaria.
4. Journey 2 — affordability / Home Profile.
5. Journey 3 — payment pressure.
6. Journey 4 — inconsistency/protect.
7. Buy / Compra Segura.
8. partner/bank adapters y marketplace cuando el modelo comercial esté validado.
