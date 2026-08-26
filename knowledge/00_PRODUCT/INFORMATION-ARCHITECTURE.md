# VIVIENDA — Information Architecture V0.1

Date: 2026-08-25
Status: Proposed for UX validation

## IA principle

Organize the product around user decisions and lifecycle moments, not around internal legal/financial product categories.

A user should not need to know whether they need “art. 17.8”, “art. 20”, “cesión” or “consumer-financial protection” before beginning.

## Primary public navigation

### Inicio

Role:

- establish category;
- explain trust model;
- route by intent;
- immediately expose useful tools.

### Comprar vivienda

Role:

- preparation and financing before ownership.

Child topics/tools:

- ¿Cuánto puedo comprar?
- Comprar vs arrendar
- Costo real de tener vivienda
- Crédito hipotecario vs leasing
- Pesos vs UVR
- Preparar mi perfil
- Comparar financiación
- Checklist para comprar

### Mi crédito

Role:

- current-loan understanding and optimization.

Child topics/tools:

- Revisar mi crédito
- Terminar antes / abonos
- Comparar compra de cartera
- Reestructuración / Ley 546
- Seguros y costos
- Salud de mi crédito

### Tengo un problema

Role:

- payment pressure, inconsistency and escalation.

Child intents:

- Mi cuota se volvió difícil
- Tengo mora o cobranza
- Aplicaron mal un pago/abono
- Me negaron una solicitud
- No entiendo un cobro
- Recibí una demanda o notificación

Do not make “contratar abogado” a top-level primary navigation item. Legal help appears in-context when needed.

### Aprende

Role:

- trusted plain-language education;
- organic acquisition;
- bridge into tools.

Initial clusters:

- Crédito de vivienda
- Ley 546
- UVR y pesos
- Leasing habitacional
- Abonos y amortización
- Compra de cartera
- Mora y consumidor financiero
- Compra segura de vivienda

### Cuenta / Mi vivienda

Authenticated entry.

On desktop: account navigation item.
On mobile: persistent but secondary entry.

## Home architecture

Recommended narrative order:

### 1. Hero / intent

The hero should answer:

- what VIVIENDA helps with;
- for whom;
- one primary action.

Primary CTA should start a useful decision flow, not a generic sales conversation.

Potential intent switcher beneath/within hero:

- Ya tengo crédito
- Quiero comprar

Payment-problem route can appear as a calm secondary path.

### 2. Immediate utility

Expose a lightweight tool/result preview.

Examples:

- existing borrower: enter balance/payment/term;
- buyer: income/debts/down payment.

### 3. Why trust the result

Explain:

- assumptions visible;
- public/official data where used;
- no bank approval implied;
- legal analysis labeled preliminary where applicable;
- user can act alone when appropriate.

### 4. Decision universe

Show that VIVIENDA compares actions rather than merely banks.

### 5. How it works

Three or four steps maximum:

1. Understand
2. Compare
3. Decide
4. Execute/monitor

### 6. Relevant product pathways

Not a generic grid of eight products. Use outcome groupings:

- Pay better
- Buy better
- Solve a problem

### 7. Education / proof

Real methodology, examples, references or verified outcomes when available.

### 8. Final task CTA

Repeat primary value-start action.

## Existing borrower IA

### `/mi-credito`

Purpose: intent landing and/or quick loan-health start.

Sections:

- quick snapshot input;
- what we can analyze;
- what requires statement;
- DIY transparency;
- common questions.

### `/mi-credito/abonos`

Interactive prepayment tool.

### `/mi-credito/salud`

Authenticated or document-backed Loan Health.

### `/mi-credito/compra-cartera`

Comparison education + personalized path.

### `/mi-credito/reestructuracion`

Plain-language restructuring and annual Law 546 screening.

Do not make “Ley 546” the URL/category for every optimization mechanism.

## Prospective buyer IA

### `/comprar`

Preparation hub.

### `/comprar/cuanto-puedo-comprar`

Affordability.

### `/comprar/comprar-vs-arrendar`

Decision calculator.

### `/comprar/costo-real`

Ownership-cost calculator.

### `/comprar/financiacion`

Structure comparison and personalized financing path.

### `/comprar/perfil`

Authenticated Home Profile.

## Problem/help IA

### `/ayuda`

Intent-based triage.

Avoid presenting a directory of legal services first.

### Dynamic route after triage

Result card:

- issue category;
- urgency;
- what to gather;
- what can be tried directly;
- when professional review is appropriate.

Potential execution converts into authenticated case workspace.

## Authenticated app navigation

Keep navigation substantially simpler than public site.

### Inicio

Personal dashboard.

### Mi perfil

Home Profile and household.

### Mi crédito

Mortgage Twin / Loan Health.

### Simulaciones

Saved decisions/scenarios.

### Casos

Only visible if execution workflows exist.

### Documentos

Documents with provenance/status.

### Privacidad

Consents, connections, retention/deletion controls.

Do not replicate public marketing navigation inside the app.

## Dashboard hierarchy

### Top

Current decision state:

- what user has;
- last updated;
- next relevant action/opportunity.

### Main

1. Loan/current housing snapshot
2. Opportunities requiring attention
3. Scenario shortcuts
4. Timeline/recent activity
5. Education contextual to current state

Avoid generic KPI dashboards that show numbers without decisions.

## Search and content taxonomy

Content should be tagged by:

- lifecycle: prepare/buy/finance/manage/optimize/protect;
- audience: buyer/existing borrower/payment pressure;
- product: mortgage/leasing/UVR/etc.;
- action: compare/prepay/restructure/complain;
- legal basis where applicable;
- update date / freshness requirement.

This enables contextual recommendations without exposing legal taxonomy in primary UI.

## Trust architecture as IA

Trust information must be reachable contextually, not hidden in footer only.

Persistent resources:

- Cómo calculamos
- Fuentes y metodología
- Privacidad y seguridad
- Qué somos / qué no somos
- Cómo ganamos dinero / conflicts disclosure when relevant
- Qué puedes hacer gratis por tu cuenta

This content can substantially differentiate VIVIENDA from opaque intermediaries.

## Mobile IA

Bottom navigation for authenticated app candidate:

- Inicio
- Mi crédito / Mi vivienda
- Simular
- Cuenta

Cases may appear contextually rather than consume permanent tab until usage justifies it.

Public mobile navigation should prioritize:

- Ya tengo crédito
- Quiero comprar
- Tengo un problema
- Aprende

## IA questions requiring research

1. Does “Mi crédito” or “Mi vivienda” better match user mental model for ongoing loan management?
2. Is “Salud de mi crédito” intuitive or overly abstract?
3. Should existing borrowers land directly in a calculator or first see context/trust?
4. Do users perceive “Comprar vivienda” as property search rather than financial planning?
5. How should we label assisted financial execution without implying VIVIENDA is the lender?
6. Does “Tengo un problema” create unnecessary anxiety, or is it direct/helpful?
7. Which legal terms do users actively search and therefore deserve SEO routes even if not primary navigation?

## IA acceptance criteria

A first-time test participant should be able to locate in under one minute:

- how to estimate affordability;
- how to see the effect of an extra mortgage payment;
- where to compare transfer/refinancing options;
- what to do when payment is difficult;
- where to understand Law 546;
- where their saved loan information lives.

If they need to understand our internal product taxonomy to do so, IA has failed.