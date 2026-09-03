# VIVIENDA — Borrower Quick Check Usability Script V0.1

## Research question

Can a borrower complete the anonymous Quick Check, understand what is known vs estimated, correctly interpret a prepayment scenario, and choose a next step without feeling forced to surrender contact/document data?

## Participants

Minimum first round: 5 participants.

Target mix:
- 3 current mortgage borrowers;
- 1 housing lease borrower if possible;
- 1 borrower unfamiliar with UVR/amortization terminology;
- mix of banks/entities;
- at least 2 mobile-primary users.

Do not recruit only financially sophisticated participants.

## Session length

30–40 minutes.

## Moderator rule

Do not teach the product while testing it. If the participant asks what a label means, first ask what they think it means.

## Intro

Explain:
- we are testing the interface, not the person;
- prototype values may be examples;
- there are no right answers;
- think aloud;
- do not provide actual passwords or sensitive banking credentials.

## Task 1 — Start without prior explanation

Prompt:
“Imagina que llevas varios años pagando tu crédito de vivienda y quieres saber si hay algo que valga la pena revisar. Entra aquí y haz lo que harías normalmente.”

Observe:
- does user identify the borrower route?
- trust reaction to no-ID promise;
- hesitation at first CTA;
- interpretation of “revisar”.

Success:
- starts Quick Check without moderator guidance.

## Task 2 — Complete Quick Check

Provide a test profile card rather than asking for real financial data.

Example card:
- mortgage
- pesos
- approximate balance COP 200M
- payment COP 2.32M excluding insurance or clearly marked
- remaining term 15 years
- rate 12% EA when needed

Observe:
- currency input friction;
- meaning of pesos/UVR;
- whether “I don’t know” feels acceptable;
- back navigation;
- progress perception.

Success target:
- completion <= 90 seconds after reading the profile.

## Task 3 — Interpret first result

Do not explain the result.

Ask:
1. “Cuéntame qué te está diciendo esta pantalla.”
2. “¿Qué cosas cree VIVIENDA que sabe con seguridad?”
3. “¿Qué cosas todavía no sabe?”
4. “¿Esto es una oferta de un banco?”
5. “¿Qué harías ahora?”

Success:
- correctly distinguishes input/estimate/verified status;
- does not interpret result as bank approval or legal conclusion.

## Task 4 — Simulate extra monthly payment

Prompt:
“Quieres ver qué pasaría si pudieras pagar COP 200.000 adicionales cada mes.”

Observe:
- finds recurring mode;
- understands reduce term vs reduce payment;
- understands approximate/modelled status.

After result ask:
“¿Qué cambió?”

## Task 5 — Benefit Breakdown comprehension

This is critical.

Ask:
1. “¿De dónde sale este beneficio?”
2. “¿Los COP 200.000 mensuales son ahorro que te consiguió VIVIENDA?”
3. “¿Qué parte del resultado considerarías realmente ahorro/beneficio?”
4. “¿Qué supuesto te gustaría revisar?”

Pass criterion:
At least 4/5 participants can explain in their own words that additional principal is their contribution and modeled avoided interest is a separate effect.

If fewer than 4/5 pass, Benefit Breakdown is a blocking redesign issue.

## Task 6 — Choose how to continue

Prompt:
“Ahora decide qué harías si esto fuera tu crédito real.”

Observe:
- whether DIY is discoverable;
- whether upload feels coercive;
- whether compare route is understood;
- whether legal route appears prematurely.

Ask:
“¿Cuál de estas opciones parece gratuita? ¿Cuál podría tener un costo?”

## Task 7 — Document upload trust

Prompt:
“Quieres mejorar la precisión. Revisa esta pantalla como si fueras a subir tu extracto.”

Ask:
1. “¿Qué información crees que va a usar la plataforma?”
2. “¿Qué te preocupa?”
3. “¿Qué necesitarías saber antes de subirlo?”
4. “¿Crees que te están pidiendo entrar a tu banco?”

Success:
- user understands no credentials are needed;
- purpose of upload is clear;
- secondary continue-with-estimates route is discoverable.

## Task 8 — Extraction review

Give one low-confidence field and one deliberately incorrect OCR field.

Observe:
- user notices confidence cue;
- edit behavior;
- understanding that extracted data is not automatically truth.

Ask:
“¿Qué pasaría si confirmas sin corregir?”

## Task 9 — Mortgage Twin

Ask:
“¿Qué representa esta pantalla para ti?”

Success concepts:
- current state of credit;
- information can be updated;
- opportunities are recommendations, not mandatory actions;
- sources/date are available.

## Post-test trust questions

Rate 1–7:
- I understood what the platform knew.
- I understood what was only estimated.
- I trusted the numbers enough to explore further.
- I felt in control of my data.
- I felt I could leave without buying anything.
- I would return to check this credit later.

Then ask:
“What is the one thing that made this feel trustworthy?”
“What is the one thing that made you suspicious?”

## Comprehension blockers

Any of these is release-blocking:
- simulation interpreted as guaranteed bank outcome;
- user thinks own extra principal is VIVIENDA-generated savings;
- user thinks upload requires banking password;
- user cannot find DIY option;
- automated legal screen interpreted as attorney opinion;
- user cannot tell public reference rate from personalized offer.

## Behavioral blockers

- >20% rage/abandonment on amount entry in first round;
- repeated inability to return/back without loss;
- mobile CTA covering explanatory disclosure;
- inability to use flow keyboard-only;
- extraction correction not discoverable.

## Recording / notes template

Per participant record:
- device
- borrower type
- completion time
- observed hesitations
- wording quoted verbatim
- errors
- comprehension results
- trust score
- chosen next action
- facilitator interventions required

Do not record real account numbers, IDs, credentials or unredacted statements for prototype testing.

## Decision rule after round 1

Classify findings:
- P0 trust/safety/comprehension
- P1 task completion
- P2 friction
- P3 polish

Fix all P0/P1 before visual styling is treated as stable.
