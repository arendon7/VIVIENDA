# VIVIENDA — Estado de producto v0.11

Date: 2026-08-26
Status: active Loan Health slice
Base: v0.10 `cff54e319f0a3255318184371d4e1f76d424325f`

## Objetivo

Convertir `Loan Health` de concepto de producto a una evaluación cualitativa, determinista y explicable dentro de `Mi Vivienda`, sin introducir todavía un score numérico ni datos externos de mercado.

## Incluido

- contrato `LOAN-HEALTH-CONTRACT-V0.11.md`;
- evaluator puro `domain/loan-health/evaluator.ts`;
- tests de invariantes;
- componente `LoanHealthPanel`;
- integración dentro de `/mi-vivienda`;
- E2E actualizado para proteger los límites de verdad.

## Dimensiones V1

1. estructura del crédito;
2. prepago;
3. traslado / compra de cartera;
4. reestructuración anual;
5. consistencia / cobros;
6. mora / estado procesal.

## Estados permitidos

- ready;
- explore;
- needs_data;
- seasonal;
- attention;
- professional_review;
- no_flag_reported;
- not_applicable.

## Estado general

Loan Health emite únicamente un estado de decisión:

- professional_review_priority;
- attention_required;
- actionable_opportunity;
- improve_precision;
- no_priority_action_detected.

No usa `healthy`, `good`, `safe`, `approved` o probabilidades.

## Guardrails congelados

- no score 0–100;
- no proxy de score de central de riesgo;
- no probabilidad de aprobación;
- no matching bancario porcentual;
- no competitividad de tasa sin fuente externa vigente;
- no conclusión jurídica automática;
- no certificación de corrección del banco por ausencia de una alerta reportada;
- C2 no se eleva a C3.

## Ejemplo de Mi Vivienda v0.11

La demo usa un snapshot C2 explícito y una capacidad de abono de ejemplo para demostrar una oportunidad accionable de prepago. Los valores siguen rotulados como demostración y no representan información persistida de un usuario.

## Próximo slice recomendado

Una vez v0.11 quede verde, el siguiente trabajo debe probar **una ruta de ejecución asistida completa**, en lugar de ampliar más infraestructura o añadir nuevos verticales.

Candidato preferente:

**Auditoría / Optimización Hipotecaria**

porque reutiliza Mortgage Twin, Loan Health, Opportunity Router, evidencia y Case Plan/State ya construidos.
