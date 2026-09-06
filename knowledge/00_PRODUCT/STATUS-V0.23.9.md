# STATUS V0.23.9 — Assisted Execution Readiness

## Estado

**FUNCTIONALLY GREEN / DOCUMENTATION FREEZE PENDING FINAL CI**

Rama:

`product/assisted-execution-readiness-v0.23.9`

Base congelada heredada:

**V0.23.8 — Execution Intent**

Base SHA:

`dadce54b1ee5430400a14a137775450d7552b2a3`

Head funcional full green previo al STATUS:

`daa44235256347f761844e5849644c1e4e670d13`

GitHub Actions run funcional:

`34054795848`

El freeze definitivo de V0.23.9 corresponde al commit documental que contiene este STATUS, siempre que ese SHA vuelva a pasar verify + E2E FULL GREEN.

## Pregunta de producto

V0.23.9 responde:

> **Después de que el usuario elige explícitamente “Revisarlo con acompañamiento” para una Auditoría Hipotecaria R7, ¿qué tendría que ocurrir para que ese acompañamiento pudiera convertirse en un caso real sin fingir que ya existe contratación, expediente o revisión profesional?**

## Regla central

> **La preparación asistida explica la secuencia operativa real que sería necesaria, pero no registra ninguno de esos hechos en esta versión.**

## Alcance

El slice está deliberadamente limitado a:

- `R7_RECLAMACION`;
- intent `assisted_mortgage_audit`;
- track `assisted`;
- blueprint `MORTGAGE_AUDIT_R7_V1`.

No convierte otras rutas en servicios asistidos.

## Assisted Execution Readiness

Se incorpora un objeto determinístico que conserva:

- servicio y ruta canónicos;
- checklist de evidencia del blueprint R7;
- orden real de eventos de preparación;
- todos los estados operativos reales en `false`.

Estados preservados como no ocurridos:

- expediente real creado;
- autorización de datos registrada;
- aceptación de servicio;
- evidencia persistida;
- evidencia verificada;
- revisión profesional solicitada;
- revisión profesional completada;
- ejecución externa;
- facultad extrajudicial;
- poder judicial.

## Secuencia canónica visible

La preparación usa el orden del blueprint existente:

1. abrir el expediente de acompañamiento;
2. registrar autorización de datos;
3. aceptar el alcance del servicio;
4. definir la evidencia necesaria;
5. incorporar la evidencia autorizada;
6. verificar la evidencia;
7. solicitar la revisión profesional;
8. completar la revisión profesional.

V0.23.9 no ejecuta ninguno de esos pasos.

## Integración con V0.23.8

El panel solo aparece después de una elección explícita:

`R7 → Mi Decisión → Cómo quieres avanzar → Revisarlo con acompañamiento → Case Plan → Preparación del acompañamiento`

La misma ruta R7 elegida como **Prepararlo por mi cuenta** no muestra Assisted Execution Readiness.

Esto demuestra que la preparación asistida depende del intent explícito y no de inferir automáticamente un track por `humanReviewRequired`.

## Blueprint R7

Se refactorizó `mortgage-audit.ts` para separar dos contextos válidos:

### Router completo

`buildMortgageAuditBlueprint(routerResult, asOfDate)` conserva:

- rechazo si R7 no existe;
- rechazo si R10 tiene prioridad;
- construcción del blueprint R7 solo después de validar el router completo.

### Ruta ya gobernante

`buildMortgageAuditBlueprintForGovernedRoute(route, asOfDate)` permite reutilizar exactamente el mismo blueprint cuando Mi Decisión ya resolvió qué ruta gobierna.

Esto evita reconstruir lógica de router dentro del Case Plan.

## UI

Se añadió `AssistedExecutionReadinessPanel` dentro de Case Plan únicamente para el intent asistido R7.

La superficie muestra:

- **Preparación pendiente**;
- **Ningún paso operativo ha ocurrido todavía**;
- resumen explícito de estados reales en “No”;
- secuencia de ocho pasos;
- límites y avisos de no contratación/no ejecución.

No incluye botones para:

- contratar;
- aceptar servicio;
- pagar;
- subir evidencia persistente;
- abrir expediente real;
- registrar autorización;
- conceder poder;
- radicar.

## Consumer-language firewall

Los identificadores internos permanecen fuera del copy visible de cliente.

E2E verifica que no aparezcan como texto exacto:

- `CASE_CREATED`;
- `assisted`;
- `MORTGAGE_AUDIT_R7_V1`;
- `PROFESSIONAL_REVIEW_COMPLETED`.

Los `data-*` determinísticos usados por pruebas no cambian la frontera de lenguaje visible.

## Regresión E2E detectada y corregida

La primera corrida integral del nuevo spec terminó en:

- **234/236 PASS**;
- 2 fallos idénticos en desktop/mobile.

La causa no estaba en producción.

El test de exclusividad intentaba validar ausencia de readiness sobre R1 sin haber activado una oportunidad de prepago, por lo que esperaba una ruta que no existía.

Se corrigió únicamente el test para probar el contrato correcto:

- `R7 + Revisarlo con acompañamiento` → readiness visible;
- `R7 + Prepararlo por mi cuenta` → readiness ausente.

No se relajó dominio ni UI.

## Verificación funcional final

Sobre `daa44235256347f761844e5849644c1e4e670d13`:

GitHub Actions run `34054795848`:

- Typecheck — **PASS**
- Domain tests — **PASS**
- Build — **PASS**
- Borrower journey E2E — **PASS**
- Playwright — **236/236 PASS**
- Chromium desktop + mobile 390 px — **PASS**
- Remote Preview E2E — **SKIPPED por diseño** en esta rama

## Diff antes de este STATUS

Contra V0.23.8, antes de añadir este STATUS:

- 11 commits;
- 8 archivos;
- +891 / −12.

Archivos:

1. `components/vivienda/assisted-execution-readiness-panel.tsx`
2. `components/vivienda/case-plan-workspace.tsx`
3. `domain/assisted-execution/mortgage-audit.ts`
4. `domain/assisted-execution/readiness.test.ts`
5. `domain/assisted-execution/readiness.ts`
6. `knowledge/20_UX/ASSISTED-EXECUTION-READINESS-UX-SPEC-V0.23.9.md`
7. `knowledge/40_DOMAIN/ASSISTED-EXECUTION-READINESS-CONTRACT-V0.23.9.md`
8. `tests/e2e/assisted-execution-readiness.spec.ts`

Este STATUS será el noveno archivo del freeze documental.

## Documentación canónica

- `knowledge/00_PRODUCT/STATUS-V0.23.9.md`
- `knowledge/20_UX/ASSISTED-EXECUTION-READINESS-UX-SPEC-V0.23.9.md`
- `knowledge/40_DOMAIN/ASSISTED-EXECUTION-READINESS-CONTRACT-V0.23.9.md`

## Fuera de alcance

V0.23.9 no activa:

- persistencia durable;
- cuentas/autenticación;
- expediente real;
- consentimiento real;
- carga/persistencia de evidencia asistida;
- aceptación contractual;
- checkout/pago;
- SLA;
- contratación profesional;
- facultad extrajudicial;
- poder judicial;
- revisión profesional real;
- radicación ante terceros;
- respuesta externa;
- resultado verificado;
- Open Finance;
- marketplace bancario;
- comisiones/referrals.

## Siguiente paso

No abrir V0.23.10 encima de esta rama hasta que el SHA documental final pase nuevamente verify + E2E FULL GREEN y V0.23.9 quede abierto como draft PR apilado sobre #37.
