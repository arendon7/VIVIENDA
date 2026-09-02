# STATUS V0.22 — Prepayment Choice Comparison

## Estado

**FUNCTIONALLY GREEN / DOCUMENTATION FREEZE PENDING FINAL CI**

Rama:

`product/prepayment-choice-comparison-v0.22`

Base congelada heredada:

**v0.21 — Loan Health Integration**

Freeze v0.21:

`7aace6da7b52f87cc699940550305825fb5633d5`

Head funcional full green v0.22:

`48f37b83819feb52010e96f1d3c0e84974f3e510`

GitHub Actions run funcional:

`33592575673`

El freeze definitivo de v0.22 corresponde al commit documental que contiene este STATUS junto con el contrato de dominio y la UX spec de v0.22, siempre que ese SHA vuelva a pasar verify + E2E FULL GREEN. Si el gate documental falla, no existe freeze válido.

## Gate funcional confirmado

Sobre `48f37b83819feb52010e96f1d3c0e84974f3e510`:

- TypeScript: **PASS**.
- dominio total: **397/397 PASS** en 29 archivos.
- production build: **PASS**.
- Playwright: **176/176 PASS**.
- viewport E2E: Chromium desktop + mobile 390 px.

## Pregunta de producto

v0.22 responde:

> **Si aplico el mismo abono parcial inmediato a capital, ¿qué cambia si reduzco plazo frente a reducir cuota?**

La plataforma modela las dos instrucciones con el mismo abono y permite comparar sus consecuencias. No elige automáticamente por el usuario.

## Evolución frente a v0.21

v0.21 permitía que un escenario compatible elevara R1 — prepago para reducir plazo — a C2.

v0.22 añade una comparación explícita del mismo abono parcial para:

- **R1_PREPAGO_PLAZO** — conservar cuota financiera modelada y recalcular plazo;
- **R2_PREPAGO_CUOTA** — conservar plazo restante y recalcular cuota.

Ambas rutas pueden alcanzar C2 únicamente mediante el modelo determinístico realmente construido.

## Contrato financiero

El comparador exige un caso compatible:

- crédito hipotecario de vivienda;
- pesos;
- cuota constante en pesos;
- saldo válido;
- tasa EA explícita;
- cuotas restantes válidas;
- abono único > 0 y menor que el saldo.

Usa el mismo abono en las dos alternativas y mantiene tasa/sistema constantes.

## Resultados visibles

### Reducir plazo

- cuota financiera modelada;
- plazo resultante;
- reducción de plazo;
- interés nominal futuro evitado.

### Reducir cuota

- nueva cuota financiera modelada;
- reducción mensual;
- reducción porcentual;
- plazo restante;
- interés nominal futuro evitado.

## Regla central de verdad

> **La comparación no elige por el usuario y el capital aportado por el usuario no se presenta como ahorro generado por VIVIENDA.**

Menor plazo, menor cuota y menor interés nominal futuro son objetivos diferentes.

## Precisión

- Mortgage Twin base: C1 cuando proviene de transcripción del usuario.
- R1 modelado compatible: C2 local a R1.
- R2 modelado compatible: C2 local a R2.
- R3/R5/R7/R10 permanecen en la precisión que les corresponde.
- ninguna ruta obtiene C3 en v0.22.

## Invalidación fail-closed

Si cambia el abono o un input material:

- desaparece el C2 anterior vinculado al escenario;
- Loan Health vuelve al estado compatible;
- la ruta vuelve a C1 hasta reconstruir un modelo válido.

El escenario mensual heredado y la comparación de abono único son modelos distintos y mantienen precisión independiente.

## Precedencia de riesgo

Una situación de revisión profesional, inconsistencia material o proceso judicial continúa dominando sobre una optimización ordinaria de prepago. Un R1/R2 C2 válido nunca oculta R10 u otra prioridad de mayor consecuencia.

## E2E v0.22

La matriz final funcional es **176/176 PASS** en desktop + mobile 390 px.

Incluye específicamente:

1. mismo abono para R1 y R2;
2. R1 conserva cuota y reduce plazo;
3. R2 conserva plazo y reduce cuota;
4. precisión C2 local por ruta;
5. invalidación al cambiar el abono;
6. precedencia de revisión profesional;
7. continuidad del Mortgage Twin y Loan Health;
8. no overflow horizontal a 390 px;
9. comportamiento heredado de journeys anteriores.

## Reparación del CI heredado

El primer HEAD observado de v0.22 (`2fb5a056...`) tenía TypeScript, 397/397 dominio y build verdes, pero 32 fallos Playwright.

La revisión determinó que los fallos provenían principalmente de contratos E2E obsoletos frente al copy deliberadamente actualizado por v0.22:

- heading de Opportunity Workspace;
- label del capital adicional;
- formato porcentual local;
- wording de invalidación del escenario mensual.

Las correcciones de cierre modificaron únicamente tests E2E. No se cambió matemática, routing ni UX productiva para satisfacer locators.

La progresión final fue:

- 144/176 PASS en el HEAD original;
- 174/176 PASS después del primer saneamiento;
- 176/176 PASS en `48f37b83819feb52010e96f1d3c0e84974f3e510`.

## Documentación canónica de v0.22

- `knowledge/00_PRODUCT/STATUS-V0.22.md`
- `knowledge/40_DOMAIN/PREPAYMENT-CHOICE-COMPARISON-CONTRACT-V0.22.md`
- `knowledge/20_UX/PREPAYMENT-CHOICE-COMPARISON-UX-SPEC-V0.22.md`

## Fuera de alcance / no fingido

v0.22 no activa:

- C3 documental;
- OCR o verificación documental productiva;
- Supabase productivo;
- autenticación/persistencia productiva;
- modelo UVR para esta comparación;
- leasing dentro de este modelo;
- tasas de mercado automáticas;
- Open Finance o centrales;
- bank matching;
- ofertas live;
- aprobación o probabilidad de aprobación;
- ahorro garantizado;
- radicación automática;
- conclusión o representación jurídica automática.

## Siguiente paso autorizado solo después del freeze

No abrir v0.23 hasta que el SHA documental final de v0.22 quede full green y el draft PR de cierre esté abierto.
