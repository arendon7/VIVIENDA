# STATUS V0.23.7 — Decision Action Profile

## Estado

**FUNCTIONALLY GREEN / DOCUMENTATION FREEZE PENDING FINAL CI**

Rama:

`product/decision-action-profile-v0.23.7`

Base congelada heredada:

**V0.23.6 — Decision Revalidation**

Base SHA:

`c510c34bf87d257029b134c2884318766cd54745`

Head funcional full green previo al STATUS:

`c5215e9429b72d719663502d88cb85978a04171b`

GitHub Actions run funcional:

`34003270748`

El freeze definitivo de V0.23.7 corresponde al commit documental que contiene este STATUS, siempre que ese SHA vuelva a pasar verify + E2E FULL GREEN.

## Pregunta de producto

V0.23.7 responde:

> **¿Cómo puede comparar el usuario qué implica realmente perseguir cada ruta antes de continuar al plan?**

Mi Decisión incorpora una capa comparable de efecto, esfuerzo, costo y disponibilidad de ejecución sin inventar precios, servicios ni resultados.

## Regla central

> **La comparación debe exponer hechos observables del plan y del contrato de ejecución; no convertirlos en un score subjetivo ni presentar como disponible aquello que todavía no está productizado.**

## Action Profile

Cada ruta actual recibe exactamente un perfil de acción con:

- efecto esperado;
- precisión propia de la ruta;
- tareas del usuario;
- tareas profesionales;
- tareas de banco/tercero;
- tareas condicionales;
- evidencias requeridas/recomendadas;
- dependencia de eventos externos;
- disponibilidad de autogestión;
- disponibilidad asistida;
- necesidad de revisión profesional;
- estado real del precio/costo.

Los perfiles se construyen desde `OpportunityRoute + Case Plan` y se integran dentro de `DecisionObject`.

## Efecto esperado

V0.23.7 usa efectos direccionales y categóricos:

- R1 — buscar reducción de plazo;
- R2 — buscar reducción de cuota;
- R3 — preparar una estructura de pago sostenible cuando aplique;
- R5 — preparar/activar una cesión cuando exista soporte;
- R7 — aclarar/corregir una inconsistencia concreta;
- R10 — priorizar protección jurídica mediante revisión profesional.

Ningún efecto equivale a resultado garantizado.

## Esfuerzo

No existe score `bajo / medio / alto`.

El esfuerzo visible se deriva objetivamente del Case Plan:

- número de tareas del usuario;
- pasos profesionales;
- pasos de banco/tercero;
- tareas condicionales;
- número de evidencias;
- eventos externos todavía no acreditados.

## Autogestión

### R1 / R2

La UI puede indicar que existe autogestión para **preparar** la instrucción.

La vista no:

- envía la instrucción;
- ejecuta el prepago;
- radica ante el banco;
- afirma que el banco ya actuó.

### Preparación únicamente

Rutas como R3, R5 y R7 pueden permitir preparar evidencia/acción sin afirmar que el resultado depende solo del usuario.

### No apropiada como autogestión ordinaria

R10 y rutas de revisión jurídica no se presentan como DIY suficiente.

## Ejecución asistida

Solo R7 tiene actualmente un contrato asistido definido: **Auditoría Hipotecaria v0.12**.

V0.23.7 lo presenta únicamente como modalidad asistida definida para una versión de demostración.

No activa:

- contratación;
- pago;
- SLA;
- precio final;
- poder;
- representación profesional.

Las demás rutas no se convierten automáticamente en servicios asistidos por el hecho de requerir revisión profesional.

## Costo y precio

### Capital del usuario

R1/R2 separan expresamente el capital adicional aportado por el usuario de cualquier tarifa del producto.

### Precio de servicio

Estados soportados:

- `not_applicable`;
- `not_quoted_preview`;
- `not_available_in_preview`.

Estos nombres son internos de dominio. La UI usa lenguaje de consumidor en español y no expone vocabulario de ingeniería.

### Costos externos

Permanecen `not_modeled` mientras no exista una fuente concreta que soporte bancos, terceros, impuestos, trámites o honorarios.

## Precisión

Cada perfil conserva la precisión de su propia ruta.

Ejemplo válido:

`R1 C2 + R7 C1 + R10 C1`

La capa de comparación no promueve rutas hermanas ni transforma una simulación en aprobación.

## Integración con V0.23.6

Los Action Profiles se reconstruyen con el router actual.

Si Decision Revalidation detecta cambio material:

- el Decision Brief muestra las implicaciones actuales;
- Case Plan permanece bloqueado;
- el usuario debe revisar el nuevo fundamento antes de continuar.

V0.23.7 no debilita ni reemplaza la revalidación.

## Consumer-language firewall

Durante la primera corrida integral, el firewall detectó el anglicismo visible `preview` introducido por este slice en `/mi-vivienda`.

Se corrigió el copy para mantener terminología de consumidor en español sin modificar el contrato interno.

Resultado final funcional:

- 228 E2E PASS;
- 0 fallos del consumer-language firewall.

## Gate funcional confirmado

Sobre `c5215e9429b72d719663502d88cb85978a04171b`:

- TypeScript: **PASS**
- Domain tests: **PASS**
- Production build: **PASS**
- Borrower journey Playwright: **228/228 PASS**
- Remote Preview E2E: **SKIPPED por diseño** en esta rama

Run: `34003270748`

## Diff funcional contra V0.23.6

Antes de este STATUS:

- 13 commits;
- 8 archivos;
- +842 / −15.

Archivos funcionales/documentales del slice:

1. `components/vivienda/decision-brief-panel.tsx`
2. `domain/decision-object/action-profile-integration.test.ts`
3. `domain/decision-object/action-profile.test.ts`
4. `domain/decision-object/action-profile.ts`
5. `domain/decision-object/evaluator.ts`
6. `knowledge/20_UX/DECISION-ACTION-PROFILE-UX-SPEC-V0.23.7.md`
7. `knowledge/40_DOMAIN/DECISION-ACTION-PROFILE-CONTRACT-V0.23.7.md`
8. `tests/e2e/decision-workspace.spec.ts`

Este STATUS será el noveno archivo del freeze documental.

## Documentación canónica

- `knowledge/00_PRODUCT/STATUS-V0.23.7.md`
- `knowledge/20_UX/DECISION-ACTION-PROFILE-UX-SPEC-V0.23.7.md`
- `knowledge/40_DOMAIN/DECISION-ACTION-PROFILE-CONTRACT-V0.23.7.md`

## Fuera de alcance

V0.23.7 no activa:

- precios finales;
- checkout/pagos;
- SLA;
- marketplace bancario;
- comisiones/referrals;
- envío automático de solicitudes;
- contratación profesional;
- persistencia durable de decisiones;
- cuentas/autenticación;
- ofertas bancarias personalizadas;
- aprobaciones bancarias;
- ejecución ante terceros.

## Siguiente paso

No abrir V0.23.8 encima de esta rama hasta que el SHA documental final pase nuevamente verify + E2E FULL GREEN y V0.23.7 quede abierto como draft PR apilado sobre #35.
