# STATUS V0.23.8 — Execution Intent / Track Resolution

## Estado

**FUNCTIONALLY GREEN / DOCUMENTATION FREEZE PENDING FINAL CI**

Rama:

`product/execution-intent-v0.23.8`

Base congelada heredada:

**V0.23.7 — Decision Action Profile**

Base SHA:

`ec4cb74765c251589e2b4c1e210a44d05916bc74`

Head funcional FULL GREEN previo al STATUS:

`a54579037fee43e687ebd1b1ba118a56be0b069d`

GitHub Actions run funcional:

`34015046954`

El freeze definitivo de V0.23.8 corresponde al commit documental que contiene este STATUS, siempre que ese SHA vuelva a pasar verify + E2E FULL GREEN.

## Pregunta de producto

V0.23.8 responde:

> **Después de elegir una ruta en Mi Decisión, ¿cómo declara el usuario de forma explícita cómo quiere avanzar antes de abrir el Case Plan?**

La respuesta es una frontera nueva y determinística de **Execution Intent** entre Mi Decisión y Case Plan.

Flujo canónico:

`Mi Situación → Radar Vivienda → Mi Decisión → Cómo quieres avanzar → Case Plan → Historial local de demostración`

## Regla central

> **El track de ejecución describe cómo el usuario decidió organizar el siguiente paso; no se deduce automáticamente de que una ruta requiera revisión humana.**

Por tanto:

- `humanReviewRequired` no equivale por sí solo a track `legal`;
- una ruta puede requerir revisión profesional y aun permitir preparación propia;
- solo las modalidades explícitamente soportadas se muestran;
- ninguna modalidad queda preseleccionada;
- Case Plan permanece cerrado hasta que exista una selección explícita.

## Execution Intent

Estados internos soportados en esta versión:

- `prepare_self` → track `self_service`;
- `assisted_mortgage_audit` → track `assisted`;
- `professional_review` → track `legal`.

Estos nombres son internos de dominio. La UI utiliza lenguaje de consumidor en español.

## Autogestión

Cuando el Action Profile no marca la autogestión como `not_appropriate`, se ofrece:

**Prepararlo por mi cuenta**

Esta opción:

- organiza pasos y documentos;
- no crea expediente;
- no registra autorización de datos;
- no contrata servicio;
- no concede poder;
- no radica ni ejecuta actuaciones ante terceros.

## R7 — Auditoría Hipotecaria

R7 puede exponer dos modalidades separadas cuando el Action Profile conserva el blueprint asistido existente:

1. **Prepararlo por mi cuenta** → `self_service`;
2. **Revisarlo con acompañamiento** → `assisted`.

La modalidad asistida:

- reutiliza el contrato de Auditoría Hipotecaria ya definido para demostración;
- no crea contratación productiva;
- no cobra;
- no registra aceptación de servicio;
- no abre expediente real;
- no concede representación.

Esta separación corrige la inferencia anterior en la que una ruta con revisión humana podía terminar erróneamente clasificada como `legal`.

## R10 — revisión profesional

Cuando una ruta no es apropiada como autogestión ordinaria y la revisión profesional es requerida, la única modalidad disponible es:

**Preparar revisión profesional** → `legal`.

Esta selección:

- organiza información para revisión;
- no contrata abogado;
- no concede poder;
- no define estrategia jurídica;
- no ejecuta defensa ni actuación procesal.

## Track ≠ capacidad

V0.23.8 mantiene separadas las capacidades del expediente:

- autorización de datos;
- aceptación de servicio;
- facultad extrajudicial;
- poder judicial;
- solicitud/completitud de revisión profesional;
- radicación;
- respuesta;
- resultado verificado.

Elegir un Execution Intent no activa ninguna de ellas.

## Integración con Case Plan

Case Plan se construye únicamente después de una selección explícita.

La selección local se muestra como contexto del plan, pero no cambia:

- precisión heredada de la ruta;
- status de la ruta;
- obligaciones probatorias;
- bloqueos;
- próximos eventos;
- límites de ejecución.

## Integración con Case Timeline

`CaseTimelinePreview` deja de inferir el track desde `humanReviewRequired`.

Ahora recibe el `CaseTrack` seleccionado explícitamente y lo utiliza como origen del evento `CASE_CREATED` de demostración.

Consecuencias:

- R7 asistido inicia como `assisted`;
- R10 inicia como `legal`;
- una ruta preparada por el usuario inicia como `self_service`;
- el historial no reconstruye una modalidad diferente a la escogida.

Además, la simulación de aceptación de servicio solo se ofrece al track `assisted`; el track `legal` no implica por defecto que exista un servicio contratado.

## Fail closed

El resolver falla cerrado cuando:

- el Action Profile pertenece a otra ruta;
- no existe ninguna modalidad soportada;
- se intenta seleccionar un intent que no está disponible para la resolución actual.

No existe fallback silencioso a `legal`, `assisted` o `self_service`.

## Consumer-language firewall

La UI expone lenguaje de consumidor:

- `Cómo quieres avanzar`;
- `Prepararlo por mi cuenta`;
- `Revisarlo con acompañamiento`;
- `Preparar revisión profesional`;
- `Autogestión`;
- `Acompañamiento`;
- `Revisión profesional`.

No expone los identificadores internos de dominio como copy de cliente.

## Regresión E2E detectada y corregida

La primera corrida integral del slice llegó a:

- **222/230 PASS**;
- 8 fallos;
- los 8 correspondían a los mismos 4 escenarios en desktop y mobile.

La causa no era funcional: cuatro pruebas históricas asumían todavía el flujo directo `Mi Decisión → Case Plan`.

Se corrigió exclusivamente el helper E2E para atravesar la nueva frontera:

`Mi Decisión → Cómo quieres avanzar → selección explícita → Case Plan`.

No se modificó dominio ni UI para satisfacer esos tests.

## Gate funcional confirmado

Sobre `a54579037fee43e687ebd1b1ba118a56be0b069d`:

- TypeScript: **PASS**
- Domain tests: **PASS**
- Production build: **PASS**
- Borrower journey Playwright: **230/230 PASS**
- Chromium desktop + mobile 390 px: **PASS**
- Remote Preview E2E: **SKIPPED por diseño** en esta rama

Run: `34015046954`

## Diff funcional contra V0.23.7

Antes de este STATUS:

- 11 commits;
- 10 archivos;
- +985 / −33.

Archivos funcionales/documentales del slice:

1. `components/vivienda/case-plan-workspace.tsx`
2. `components/vivienda/case-timeline-preview.tsx`
3. `components/vivienda/execution-intent-panel.tsx`
4. `domain/execution-intent/resolver.test.ts`
5. `domain/execution-intent/resolver.ts`
6. `knowledge/20_UX/EXECUTION-INTENT-UX-SPEC-V0.23.8.md`
7. `knowledge/40_DOMAIN/EXECUTION-INTENT-CONTRACT-V0.23.8.md`
8. `tests/e2e/borrower-quick-check.spec.ts`
9. `tests/e2e/case-timeline-preview.spec.ts`
10. `tests/e2e/decision-workspace.spec.ts`

Este STATUS será el undécimo archivo del freeze documental.

## Documentación canónica

- `knowledge/00_PRODUCT/STATUS-V0.23.8.md`
- `knowledge/20_UX/EXECUTION-INTENT-UX-SPEC-V0.23.8.md`
- `knowledge/40_DOMAIN/EXECUTION-INTENT-CONTRACT-V0.23.8.md`

## Fuera de alcance

V0.23.8 no activa:

- persistencia durable de decisiones o intents;
- creación real de expedientes;
- identidad/cuentas;
- autorización real de tratamiento de datos;
- contratación profesional;
- aceptación contractual productiva;
- checkout/pagos;
- SLA;
- poder o representación;
- envío/radicación ante bancos o terceros;
- estrategia jurídica automática;
- marketplace bancario;
- comisiones/referrals;
- Open Finance;
- ofertas o aprobaciones bancarias.

## Siguiente paso

No abrir el siguiente slice encima de esta rama hasta que el SHA documental final pase nuevamente verify + E2E FULL GREEN y V0.23.8 quede abierto como draft PR apilado sobre #36.