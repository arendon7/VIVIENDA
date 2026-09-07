# ASSISTED EVIDENCE READINESS UX SPEC — V0.23.10

Status: implementation contract

## User problem

After choosing R7 with accompaniment, the user can understand the future service sequence but still needs a practical answer before sharing sensitive documents:

> Which supports do I already have and which do I still need to collect?

## Placement

The local inventory appears only after:

`R7 → Mi Decisión → Revisarlo con acompañamiento → Case Plan`

It follows the V0.23.9 operational-readiness panel and replaces the duplicate static evidence list for this assisted path.

R7 self-service and other routes keep the ordinary Case Plan evidence list.

## Primary interaction

For every canonical checklist item the user may choose:

- **Lo tengo**
- **Me falta**

No default choice is selected.

A user can change the declaration at any time in the local session.

A reset control appears only after at least one declaration exists.

## Language rule

Never describe `Lo tengo` as:

- uploaded;
- received;
- attached;
- verified;
- accepted;
- valid;
- sufficient.

Use language such as:

- `Disponible según tú`
- `Te falta`
- `Sin clasificar`
- `Declaraste disponibles los soportes actuales`

The word **declaraste** is important because availability is self-reported.

## Summary

Show transparent counts:

- available according to user;
- missing;
- undeclared;
- conditional.

Do not create a percentage score, readiness score or probability.

## Current vs conditional evidence

Current items:

- `known_required`
- `recommended`

Conditional items remain visible with language such as:

`Solo si ese hecho o documento existe`.

An undeclared conditional item does not block the local current-preparation message.

## Preparation messages

### Needs classification

Tell the user how many current items remain to classify.

### Needs collection

Tell the user how many current supports they reported missing.

### Declared ready for future intake

State clearly that all current supports were **reported available**, but a future real intake must still authorize, upload and verify each document separately.

Never use `listo para revisión profesional` based only on local declarations.

## Sensitive-data boundary

This surface must not contain:

- file inputs;
- drag-and-drop upload;
- free-form document content fields;
- identity-document request;
- account-number field;
- power/mandate request;
- payment or service-acceptance control.

The user gets preparation value before giving sensitive data.

## Truth reminder per item

Each item must state that the local mark does not mean the document has been uploaded, retained or reviewed by Casa con Criterio.

## Accessibility

- each evidence item is a semantic article;
- `Lo tengo` and `Me falta` use `aria-pressed`;
- state changes are reflected in explicit text/data state, not color alone;
- summary labels remain textual;
- reset is a normal button;
- mobile layout must preserve both choices without horizontal dependence.

## Interaction with V0.23.9

V0.23.9 remains the operational sequence source.

V0.23.10 does not mark any V0.23.9 operational step complete. In particular, local declarations do not advance:

- case creation;
- data authorization;
- service agreement;
- evidence attachment;
- evidence verification;
- professional review.

## Interaction with local Case Timeline

The inventory is independent of the Case Timeline demonstration.

Changing `Lo tengo / Me falta` must not append Case State events.

If the user opens the local timeline afterward, its demo history remains governed by the Case State demo controls, not by evidence-inventory declarations.

## Acceptance criteria

- shown only for R7 assisted path;
- absent for R7 self-service;
- starts unclassified;
- supports are canonical, not user-created;
- `Lo tengo` and `Me falta` are reversible local choices;
- current missing support changes the preparation state to collection needed;
- all current items declared available yields only future-intake readiness language;
- conditional undeclared items do not block current preparation;
- no file input exists;
- no upload/submit/pay/contract action exists;
- reset restores untouched state;
- internal enum identifiers are not customer-visible;
- desktop and mobile E2E cover the flow.
