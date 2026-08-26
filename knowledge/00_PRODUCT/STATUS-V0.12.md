# VIVIENDA — Estado de producto v0.12

Date: 2026-08-26
Status: active assisted-execution slice
Base: v0.11 `6dec13bc7ba35abc05020bcabfb60e7a10a6de7f`

## Objetivo

Probar la primera ruta asistida end-to-end sin construir un workflow universal nuevo.

Ruta elegida:

**Auditoría Hipotecaria documental sobre R7_RECLAMACION.**

## Incluido

- contrato `MORTGAGE-AUDIT-ASSISTED-V0.12.md`;
- blueprint puro `domain/assisted-execution/mortgage-audit.ts`;
- tests de invariantes;
- `/auditoria-hipotecaria` como preview explícito de servicio no contratado;
- visualización del trigger, evidencia, Case Plan, resultados permitidos y secuencia segura de Case events;
- E2E desktop/mobile.

## Condición de entrada

La ruta solo existe si el Opportunity Router produce R7 a partir de una inconsistencia concreta.

Si R10 es la ruta prioritaria por proceso ejecutivo/embargo/remate, el blueprint R7 falla y exige re-ruteo.

## Track y capacidades

- Case track: `assisted`.
- Data authorization: requerida.
- Service agreement: requerido.
- Evidence verification: requerida antes de review profesional.
- Professional review: requerida.
- Extrajudicial authority: **no concedida**.
- Judicial power: **no concedido**.
- Filing/submission: no se registra sin una actuación real y evidencia/referencia.

## Secuencia mínima

1. CASE_CREATED
2. DATA_AUTHORIZATION_RECORDED
3. SERVICE_AGREEMENT_ACCEPTED
4. EVIDENCE_REQUESTED
5. EVIDENCE_ATTACHED
6. EVIDENCE_VERIFIED
7. PROFESSIONAL_REVIEW_REQUESTED
8. PROFESSIONAL_REVIEW_COMPLETED

No se incluye `SUBMISSION_RECORDED` en la secuencia mínima.

## Resultados permitidos

- `explained`;
- `needs_more_evidence`;
- `possible_inconsistency`;
- `route_change_required`.

No existe un estado automático `illegal`.

## Regla de navegación

`/auditoria-hipotecaria` no se añade como cross-sell genérico al dashboard normal. Debe aparecer contextualmente cuando la situación del usuario active R7.

## Fuera de alcance

- pago productivo;
- contratación productiva;
- firma/poder;
- representación automática;
- radicación automática;
- OCR live;
- litigio;
- negociación;
- pricing/SLA definitivo.

## Siguiente paso si v0.12 queda verde

Con la primera ruta asistida probada, el siguiente slice debe volver al roadmap de producto y desarrollar **Journey 2 — Prospective Buyer / affordability + Home Profile**, antes de ampliar más Case infrastructure.
