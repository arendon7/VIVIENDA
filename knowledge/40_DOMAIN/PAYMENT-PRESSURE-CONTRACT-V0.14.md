# PAYMENT PRESSURE TRIAGE CONTRACT v0.14

Date: 2026-08-26
Status: domain contract
Scope: Journey 3 — payment pressure / `/ayuda`

## 1. Objective

Help a housing borrower understand **urgency, evidence and the next legitimate step** when payment is becoming difficult, without fear marketing or automated legal strategy.

The product must distinguish:

- preventive financial pressure;
- early arrears;
- collections / prelegal collection;
- reported judicial process;
- embargo/auction-stage report;
- unknown/insufficient state.

It must not treat every payment problem as litigation or every collection contact as a court process.

## 2. Reuse before expansion

v0.14 reuses the existing canonical contracts:

- `ProductType`;
- `PaymentState`;
- `OpportunityRouterInput`;
- `R3_RESTRUCTURACION_546_20`;
- `R7_RECLAMACION` only when an actual inconsistency is separately reported;
- `R10_EXECUTIVE_DEFENSE` when an executive process / embargo-or-auction state is reported.

Do not create a generic new Case workflow merely to represent ordinary bank contact or payment-pressure triage.

## 3. Input

```ts
type PaymentPressureChange = "yes" | "no" | "unknown";
type NextPaymentOutlook = "can_pay" | "at_risk" | "cannot_pay" | "unknown";

type PaymentPressureInput = {
  asOfDate: string;
  productType: ProductType;
  paymentState: PaymentState;
  materialEconomicChange: PaymentPressureChange;
  nextPaymentOutlook: NextPaymentOutlook;
  statementOrContractConflict?: boolean;
  unexplainedChargeOrAllocationIssue?: boolean;
};
```

No identity, phone, email, court number or sensitive document is required for the first triage result.

## 4. Urgency states

```ts
type PaymentPressureUrgency =
  | "preventive"
  | "prompt_action"
  | "professional_review"
  | "procedural_urgency"
  | "needs_information";
```

### needs_information

Use when material state cannot be classified, especially `paymentState = unknown`.

The system should ask for the latest statement / collections communication before claiming urgency.

### preventive

Typical conditions:

- credit currently reported as `current`;
- user reports risk of next payment or material economic change;
- no judicial process reported.

Safe next step:

- understand cash-flow pressure;
- contact lender early to learn available alternatives;
- gather evidence before arrears grow.

Do not promise modification/restructuring.

### prompt_action

Use for:

- `early_arrears`;
- `collections`;
- `prelegal`.

This means the issue deserves near-term attention, **not** that a court deadline exists.

Collections/prelegal must not be described as a filed court proceeding without evidence.

### procedural_urgency

Use when:

- `executive`;
- `embargo_or_auction`.

The product must immediately prioritize document-backed professional review.

Do not calculate procedural deadlines from self-reported dates in v0.14.

### professional_review

Reserved for a non-procedural case where facts independently justify professional review (for example an R7 inconsistency) without an executive/embargo state.

Professional review must be triggered by facts, not conversion pressure.

## 5. Precedence

Highest consequence wins:

1. `procedural_urgency` — executive / embargo-or-auction report;
2. `professional_review` — material inconsistency requiring professional review;
3. `prompt_action` — arrears/collections/prelegal;
4. `preventive` — still current but payment at risk/economic change;
5. `needs_information` — insufficient classification.

An R10 route must dominate ordinary optimization/restructuring messaging.

## 6. Evidence checklist

### Common

- latest available housing-credit/leasing statement;
- recent lender communications related to payment status.

### Economic pressure

If material economic change = yes:

- evidence that helps explain current household payment capacity;
- income/support documents only when the user chooses to explore a specific restructuring route.

### Collections / prelegal

Recommended:

- collection communication showing sender, date and requested amount;
- statement showing arrears/payment status;
- breakdown of any collection charge if one is disputed.

### Judicial report

Required before procedural strategy:

- court communication / demand / payment order if available;
- court or case identifier exactly as shown in evidence;
- notification/communication evidence;
- known attachment/auction orders if available.

The triage engine must not invent deadlines, defenses or procedural posture from incomplete user memory.

## 7. Collections truth boundary

Current-source reference revalidated 2026-08-26:

- SFC explains that mora, even of one installment, may enable collection activity; collection may be prejudicial or judicial depending on whether a lawsuit has been filed.
- Ley 2300 de 2023 regulates authorized channels, contact frequency and permitted contact times for collection activity.

Therefore:

- a collections call is not evidence of a lawsuit;
- `prelegal` is not `executive`;
- excessive/contact-practice complaints belong to a separate consistency/consumer-protection issue when facts support it;
- v0.14 may explain applicable collection-contact guardrails but must not automatically declare a violation.

## 8. Housing product boundary

### Mortgage housing credit

The existing Opportunity Router may screen Article 20 and other mortgage-specific routes.

### Housing leasing

Do not copy Ley 546 mortgage procedures into leasing unless separately supported by a validated contract.

The result may recommend direct lender contact and product-specific review.

### Unknown

First classify product with statement/contract. Unknown product alone does not require a lawyer.

## 9. Article 20 boundary

Article 20 screening remains delegated to the existing Opportunity Router.

v0.14 must preserve these constraints:

- the special annual window is calendar-dependent;
- current date outside January-February may produce `seasonal_wait`;
- economic change / capacity evidence remains relevant;
- no approval is guaranteed;
- the 40% rule is not evidence that a current installment above 40% is automatically unlawful.

If R10 is primary, Article 20 may remain a secondary/future consideration but cannot displace procedural review.

## 10. Direct bank-contact path

Ordinary preventive/arrears assistance does not need a new legal OpportunityRouteCode.

The triage output may provide a non-case action:

```text
contact_lender
```

with safe language such as:

- “Contacta a tu entidad para entender las alternativas disponibles y conserva la respuesta.”
- “Preparar una propuesta no significa que la entidad deba aceptarla.”

Do not claim that VIVIENDA can compel restructuring or modification.

## 11. Required output

```ts
type PaymentPressureResult = {
  urgency: PaymentPressureUrgency;
  title: string;
  explanation: string;
  primaryAction: {
    code: "classify_state" | "contact_lender" | "gather_evidence" | "professional_review";
    title: string;
    explanation: string;
  };
  evidenceChecklist: Array<{
    code: string;
    label: string;
    importance: "required_for_next_step" | "recommended" | "conditional";
  }>;
  opportunityRoutes: OpportunityRoute[];
  professionalReviewRecommended: boolean;
  legalStrategyAutomated: false;
  notices: string[];
};
```

## 12. Claim rules

Allowed:

- “Cobranza reportada; no hemos identificado un proceso judicial.”
- “Conviene actuar pronto.”
- “Reportaste un proceso judicial; necesitamos revisar documentos antes de hablar de estrategia.”
- “Esta ruta puede valer la pena explorar.”
- “No sabemos todavía si el producto es hipotecario o leasing.”

Reject:

- “Te van a quitar la casa.”
- “Tienes X días para defenderte” based only on self-report.
- “El banco debe reestructurarte.”
- “Ya estás demandado” from collection contact alone.
- “Este cobro es ilegal” without evidence/rule analysis.
- “Contrata abogado ahora” in preventive states.
- countdown timers / fabricated urgency.

## 13. UX contract

Public route: `/ayuda`

Entry language:

**“Entiende qué tan urgente es y qué puedes hacer ahora.”**

First-result flow:

1. product type;
2. payment status;
3. material economic change;
4. next-payment outlook;
5. optional inconsistency signal only if user reports one.

Result hierarchy:

**urgency → what we know → next action → evidence → route candidates → professional boundary**

No generic legal-services grid.

## 14. Accessibility / emotional-safety requirements

- calm factual copy;
- no red-only alarm screen as sole urgency signal;
- urgency must have text labels, not color alone;
- keyboard reachable;
- result heading receives focus;
- no modal countdown;
- no forced phone capture before result;
- mobile 390 px no horizontal overflow.

## 15. Acceptance criteria

1. `current + at_risk` → preventive, not legal urgency.
2. `early_arrears` → prompt action.
3. `collections` → prompt action and explicitly not judicial unless separately reported.
4. `prelegal` → prompt action, not procedural urgency.
5. `executive` → procedural urgency + professional review.
6. `embargo_or_auction` → procedural urgency + professional review.
7. `unknown` payment state → needs information.
8. R10 dominates Article 20/ordinary routes.
9. mortgage Article 20 may surface through the existing router when context supports it.
10. leasing does not inherit mortgage-specific procedures.
11. no automated court deadline exists in output.
12. no legal violation conclusion from collection conduct alone.
13. no attorney CTA in ordinary preventive state.
14. no identity/contact gate before first triage result.
15. domain tests are independent of React.

## 16. Out of scope

- insolvency eligibility;
- automated debt settlement;
- litigation strategy;
- procedural deadline calculation;
- court lookup;
- lender-specific hardship programs;
- automatic complaint generation;
- live Case creation;
- legal engagement/payment;
- collection-practice violation classifier;
- WhatsApp/phone capture before result.