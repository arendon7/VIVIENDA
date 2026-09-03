# ADR-0004 — Freeze v0.22 · Prepayment Choice Comparison

## Estado

Accepted — 2026-09-02

## Decisión

Congelar v0.22 sobre el SHA documental:

`df179c25e1e547ed0cecf0eea4a07b987f3e9a1a`

Base:

`product/loan-health-integration-v0.21` @ `7aace6da7b52f87cc699940550305825fb5633d5`

## Razón

El slice cierra una comparación determinística del mismo abono parcial inmediato bajo dos instrucciones distintas — reducir plazo y reducir cuota — manteniendo precisión local por ruta, invalidación fail-closed, precedencia de situaciones profesionales y truth boundaries explícitos.

## Gate de freeze

GitHub Actions run `33592870088` sobre `df179c25e1e547ed0cecf0eea4a07b987f3e9a1a`:

- TypeScript PASS;
- 397/397 domain tests PASS;
- production build PASS;
- 176/176 Playwright PASS;
- Chromium desktop + mobile 390 px.

## Consecuencia

- v0.22 puede abrirse como draft PR para revisión;
- freeze no significa merge ni deploy;
- no se abre v0.23 hasta registrar este cierre y resolver la estrategia de consolidación/release;
- cualquier cambio posterior al SHA de freeze requiere nuevo gate y nuevo registro de estado.
