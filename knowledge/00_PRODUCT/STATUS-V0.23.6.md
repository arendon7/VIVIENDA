# STATUS V0.23.6 — Decision Revalidation

## Estado

**FUNCTIONALLY GREEN / DOCUMENTATION FREEZE PENDING FINAL CI**

Rama:

`product/decision-revalidation-v0.23.6`

Base congelada heredada:

**V0.23.5 — Radar → Mi Decisión → Case Plan**

Base SHA:

`2130f9803e263628ceda1541abc3fa7ec743c9d1`

Head funcional full green previo al STATUS:

`5f1e951b3facb378c89fa14f3735b9b9db8a1075`

GitHub Actions run funcional:

`34002229065`

El freeze definitivo de V0.23.6 corresponde al commit documental que contiene este STATUS, siempre que ese SHA vuelva a pasar verify + E2E FULL GREEN.

## Pregunta de producto

V0.23.6 responde:

> **¿Qué pasa si el usuario ya revisó una decisión y después cambian los datos que la sustentan?**

La plataforma revalida el fundamento material de la decisión antes de permitir continuar a Case Plan.

## Regla central

> **Una preferencia puede mantenerse como contexto, pero no puede seguir siendo accionable si cambió la ruta gobernante, su precisión o su fundamento material sin una nueva revisión explícita.**

## Decision Basis Snapshot

Al seleccionar una ruta se captura localmente:

- ruta seleccionada;
- ruta gobernante;
- estado;
- precisión;
- necesidad de revisión profesional;
- bloqueos;
- evidencia requerida;
- siguiente acción;
- caveat.

No existe persistencia durable ni identificador productivo en este slice.

## Estados de revalidación

### `current`

El fundamento material no cambió. Case Plan puede abrirse.

### `review_required`

La ruta seleccionada sigue existiendo, pero cambió un elemento material. El Decision Brief se actualiza y Case Plan queda bloqueado hasta que el usuario revise y acepte el fundamento actual.

### `selection_invalid`

La ruta seleccionada dejó de existir. La decisión falla cerrado y no puede generar Case Plan.

## Cambios materiales cubiertos

- cambio de ruta gobernante;
- cambio de precisión;
- cambio de status;
- cambio de revisión profesional;
- cambio de blockers;
- cambio de evidencia requerida;
- cambio de siguiente acción;
- cambio de caveat.

Cambios solo informativos en `notices` no fuerzan revalidación.

## Casos críticos E2E

### Pérdida de C2

`R1 C2 seleccionado → cambia input material → R1 C1 → review_required → Case Plan cerrado/bloqueado → re-review → Case Plan C1`

### Aparición posterior de R10

`R1 C2 seleccionado y plan abierto → aparece proceso ejecutivo → R10 C1 gobierna → plan ordinario se cierra → review_required → re-review → Preparar revisión prioritaria → Case Plan R10 C1`

## Precedencia jurídica

R10 sigue dominando sobre optimizaciones ordinarias. La revalidación impide que una preferencia C2 anterior mantenga artificialmente C2 o el plan ordinario cuando aparece una prioridad jurídica C1.

## Gate funcional confirmado

Sobre `5f1e951b3facb378c89fa14f3735b9b9db8a1075`:

- TypeScript: **PASS**
- Domain tests: **PASS**
- Production build: **PASS**
- Borrower journey Playwright: **PASS**
- Remote Preview E2E: **SKIPPED por diseño** en esta rama

Run: `34002229065`

## Documentación canónica

- `knowledge/00_PRODUCT/STATUS-V0.23.6.md`
- `knowledge/40_DOMAIN/DECISION-REVALIDATION-CONTRACT-V0.23.6.md`
- `knowledge/20_UX/DECISION-REVALIDATION-UX-SPEC-V0.23.6.md`

## Fuera de alcance

V0.23.6 no activa:

- persistencia durable de decisiones;
- cuentas/autenticación;
- IDs estables de decisión;
- historial de supersession en backend;
- firma o consentimiento legal;
- ejecución bancaria;
- representación profesional;
- Open Finance;
- C3 documental automático;
- ofertas o aprobaciones bancarias.

## Siguiente paso

No abrir un nuevo slice encima de V0.23.6 hasta que el SHA documental final pase nuevamente verify + E2E FULL GREEN y el draft PR apilado quede abierto.
