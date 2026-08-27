# STATUS V0.21 — Loan Health Integration

## Estado

**FROZEN / FULL GREEN**

Rama:

`product/loan-health-integration-v0.21`

Base funcional heredada:

**v0.20 — Statement-Guided Mortgage Twin**

Freeze base heredado v0.20:

`4a9ff2416c6968b49366ce616d87ace02d9e5354`

Head funcional verde v0.21:

`02b58824ccd99cafc149a3f8c35222414416abb5`

README v0.21 actualizado en:

`66b462098d14c3bddfa2398fdc585d92142b3493`

El freeze definitivo corresponde al commit que contiene este STATUS junto con el README v0.21. Ese SHA debe conservar **verify + e2e FULL GREEN**; si cualquiera de esos gates falla, el freeze deja de ser válido y no se autoriza PR de cierre.

## Gate funcional

Sobre `02b58824ccd99cafc149a3f8c35222414416abb5`:

- TypeScript: **PASS**.
- dominio total: **391/391 PASS** en 29 archivos.
- Loan Health evaluator: **11 PASS**.
- Loan Health integration layer: **8 PASS**.
- production build: **PASS**.
- Playwright: **168/168 PASS**.
- viewport E2E: Chromium desktop + mobile 390 px.

La matriz crece desde 380→391 pruebas de dominio y 166→168 E2E respecto de v0.20.

El mismo gate se exige nuevamente sobre el SHA documental final antes de abrir el draft PR.

## Pregunta de producto

v0.21 responde:

> **¿Cuál es el estado actual de decisión de este Mortgage Twin real aportado por el usuario, y qué ruta específica sí alcanzó una precisión superior mediante un modelo realmente construido?**

La respuesta implementada conserva la verdad por ruta: el Mortgage Twin transcrito continúa en C1; una simulación compatible puede elevar únicamente la decisión que realmente fue modelada.

## Evolución del journey

v0.20:

`Quick Check C1 → extracto local como referencia → Mortgage Twin C1 → modelo C2 compatible → Opportunity Router / Case Plan`

v0.21:

`Quick Check C1 → Statement-Guided Mortgage Twin C1 → modelo compatible C2 → Opportunity Workspace → Loan Health → selección de ruta → Case Plan`

Loan Health deja de ser una superficie separada/conceptual y pasa a ocupar el punto correcto del journey: **después de construir la fotografía y antes de pedir al usuario escoger una ruta de ejecución**.

## Regla central de precisión mixta

> **La precisión pertenece a la decisión que la ganó: una ruta C2 no convierte el Mortgage Twin completo ni las demás rutas en C2/C3.**

En el slice actual:

- fuente base del Mortgage Twin: **C1**;
- Loan Health: **C1** como evaluación de la fuente base;
- `R1_PREPAGO_PLAZO`: **C2** solo cuando existe un escenario compatible realmente modelado y todavía vinculado a los mismos inputs;
- `R2_PREPAGO_CUOTA`: **C1**;
- `R3_RESTRUCTURE`: **C1**;
- `R5_ASSIGNMENT`: **C1**;
- `R7_AUDIT_CLAIM`: **C1**;
- `R10_EXECUTIVE_DEFENSE`: **C1**;
- ninguna ruta recibe C3 en v0.21.

No existe un `globalPrecision = C2` derivado del simple hecho de haber construido un modelo.

## Integración del escenario de prepago

Cuando `/verificar` contiene un escenario compatible de reducción de plazo:

- el monto adicional ya modelado viaja al `OpportunityWorkspace`;
- el usuario no debe volver a ingresarlo;
- el objetivo inicial se alinea con `Terminar antes`;
- R1 puede aparecer como `C2 modelado`;
- Loan Health puede marcar Prepago como `Lista para comparar`;
- las demás rutas conservan C1.

El modelo es compatible únicamente bajo las condiciones que realmente soporta el motor actual, incluidas clasificación hipotecaria, pesos y supuestos requeridos.

## Invalidación fail-closed del C2

El vínculo C2 se invalida si el usuario modifica un input que hace que el escenario previo deje de ser el mismo escenario.

En particular, v0.21 invalida el C2 previo cuando cambia, entre otros:

- el capital adicional comparado;
- la clasificación del producto;
- una condición material que rompa la compatibilidad del modelo.

Al invalidarse:

- desaparece `R1 · C2 modelado`;
- R1 vuelve a C1;
- Loan Health deja de tratar Prepago como una ruta modelada lista;
- la UI explica que el escenario previo ya no coincide con los datos actuales.

No se conserva un badge C2 obsoleto por conveniencia visual.

## Loan Health integrado

Loan Health continúa siendo una evaluación **cualitativa de estado de decisión**, no un score crediticio, bancario o de riesgo.

Dimensiones:

1. **Estructura**;
2. **Prepago**;
3. **Traslado / compra de cartera**;
4. **Reestructuración anual**;
5. **Consistencia / cobros**;
6. **Mora / proceso**.

Estados cualitativos disponibles incluyen:

- `Lista para comparar`;
- `Explorar`;
- `Faltan datos`;
- `Ventana estacional`;
- `Requiere atención`;
- `Revisión profesional`;
- `Sin alerta reportada`;
- `No aplica en este rulebook`.

No existe 0–100, porcentaje de salud, probabilidad de aprobación ni semáforo bancario.

## Precedencia de decisión

La prioridad congelada es:

`professional_review_priority > attention_required > actionable_opportunity > improve_precision > no_priority_action_detected`

Consecuencia:

- una optimización C2 no puede ocultar una situación judicial/procesal relevante;
- una inconsistencia material no se diluye detrás de una oportunidad de prepago;
- `R10_EXECUTIVE_DEFENSE` puede dominar aunque R1 conserve un modelo C2 válido;
- la necesidad de revisión profesional se muestra antes de optimizaciones ordinarias.

Regla UX congelada:

> **Loan Health explica el estado de decisión antes de pedir al usuario que elija una ruta de ejecución.**

## Opportunity Workspace

El workspace recibe desde el Mortgage Twin lo ya conocido:

- precisión de la fuente;
- tipo de producto;
- modalidad;
- etiqueta/provenance del snapshot;
- escenario R1 C2, si realmente existe.

El encabezado de v0.21 es:

**“Entiende primero el estado de decisión; después elige una ruta.”**

CTA desde el Mortgage Twin:

**“Ver mi Loan Health y rutas”**

La pregunta de prepago downstream se expresa como:

**“¿Cuánto capital adicional quieres comparar?”**

Esto evita sugerir que VIVIENDA está certificando capacidad bancaria o disponibilidad financiera.

## Regla del 40%

v0.21 conserva el boundary previamente validado:

- el 40% puede formar parte de la evaluación de una primera cuota propuesta dentro de la ruta que corresponda;
- no convierte automáticamente una cuota vigente superior a ese porcentaje en ilegalidad;
- Loan Health y la ruta detallada pueden explicar el mismo boundary en contextos distintos sin que ello constituya una conclusión jurídica automática.

## E2E v0.21

La matriz total es **168/168 PASS** en desktop + mobile 390 px.

Los nuevos/actualizados journeys prueban, entre otros:

1. continuidad desde Mortgage Twin C1 hacia Loan Health sin repetir producto/modalidad;
2. herencia del monto ya modelado sin pedirlo nuevamente;
3. `R1_PREPAGO_PLAZO C2` mientras las demás rutas permanecen C1;
4. invalidación inmediata del C2 cuando cambia el monto modelado;
5. Loan Health vuelve a `Explorar` cuando se pierde el modelo;
6. precedencia de revisión profesional sobre optimización C2;
7. navegación por teclado hacia el workspace downstream;
8. ausencia de overflow horizontal en 390 px;
9. continuidad de Case Plan y Case Timeline bajo el nuevo ingreso Loan Health-first;
10. reglas Article 20 / Article 24 heredadas sin degradación;
11. boundary del 40% sin detector automático de ilegalidad.

## Regresiones detectadas y resueltas durante el slice

El gate fail-closed encontró y obligó a resolver tres capas de contrato E2E obsoleto:

1. tests heredados buscaban el CTA v0.20 `Explorar mis próximas decisiones`;
2. tests heredados esperaban el eyebrow anterior `Loan Health V1 · cualitativo`;
3. una aserción del 40% se volvió ambigua porque v0.21 muestra legítimamente el mismo boundary tanto en Loan Health como en una ruta detallada.

Las correcciones:

- migraron los helpers al CTA `Ver mi Loan Health y rutas`;
- migraron el heading al contrato Loan Health-first;
- migraron la pregunta de capital adicional;
- acotaron la aserción del 40% al panel Loan Health;
- no añadieron CTAs fantasma, aliases de accesibilidad ni lógica de producto solo para satisfacer tests.

## Privacidad y persistencia

v0.21 conserva los boundaries de v0.20:

- journey anónimo;
- estado in-memory;
- sin cuenta obligatoria;
- sin persistencia productiva;
- sin upload servidor del extracto local;
- sin OCR;
- sin extracción documental real;
- sin datos financieros serializados en URL.

## Fuera de alcance / no fingido

v0.21 no activa:

- C3 documental;
- OCR o reconciliación documental productiva;
- Supabase productivo;
- autenticación/sesiones productivas;
- tasas actuales de mercado automáticas;
- consulta de centrales;
- Open Finance;
- conectividad bancaria;
- matching real de compra de cartera;
- ofertas live;
- elegibilidad, preaprobación o aprobación;
- probabilidad de aprobación;
- ahorro garantizado;
- contratación o representación jurídica automática;
- conclusión jurídica automática.

## Decisiones congeladas

1. **La precisión es local a la fuente o decisión que la ganó.**
2. **C2 de R1 no eleva el Mortgage Twin completo.**
3. **C2 de R1 no eleva R2/R3/R5/R7/R10.**
4. **Loan Health conserva la precisión de la fuente base.**
5. **Cambiar inputs materiales invalida el modelo previo fail-closed.**
6. **Loan Health precede la elección de ruta.**
7. **Revisión profesional y alertas materiales preceden optimizaciones ordinarias.**
8. **No existe score numérico de Loan Health.**
9. **No se repiten datos downstream cuando ya existe contexto confiable en memoria.**
10. **C3 permanece reservado para evidencia realmente derivada y reconciliada.**

## Archivos canónicos del slice

- `knowledge/40_DOMAIN/LOAN-HEALTH-INTEGRATION-CONTRACT-V0.21.md`
- `knowledge/20_UX/LOAN-HEALTH-INTEGRATION-UX-SPEC-V0.21.md`
- `domain/loan-health/evaluator.ts`
- `domain/loan-health/integration.ts`
- `components/vivienda/loan-health-panel.tsx`
- `components/vivienda/opportunity-workspace.tsx`
- `app/verificar/statement-guided-mortgage-twin.tsx`
- `tests/e2e/statement-guided-mortgage-twin.spec.ts`
- `tests/e2e/borrower-quick-check.spec.ts`
- `tests/e2e/case-timeline-preview.spec.ts`

## Siguiente paso permitido

Con **FULL GREEN sobre el SHA documental final**, v0.21 puede abrirse como **draft PR apilado sobre v0.20**.

El freeze no autoriza merge ni despliegue.