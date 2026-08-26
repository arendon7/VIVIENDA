# VIVIENDA — UX Research Plan V0.1

Date: 2026-08-25
Status: Foundation research plan

## Research objective

Replace expert assumptions with observable Colombian user behavior before visual/UX freeze.

We need evidence about:

- language users naturally use;
- what they understand about mortgage mechanics;
- which promises generate interest vs distrust;
- when they are willing to provide identity, phone and bank statements;
- whether the platform's lifecycle model matches their mental model;
- what makes them choose self-service vs assisted execution;
- what they believe “Ley 546” means;
- how they interpret savings, bank approval and legal eligibility.

## Primary research questions

### Existing borrower

1. What triggers them to reconsider their loan?
2. Can they find balance, rate, term, payment and modality on their statement?
3. What do they think an “abono inteligente” or Law 546 service actually does?
4. Do they distinguish reducing payment from reducing total cost?
5. What level of quantified value makes statement upload worthwhile?
6. What are their biggest privacy fears?
7. Would they follow DIY instructions or prefer execution assistance?
8. Do they understand the distinction between a public rate and a personalized bank offer?

### Prospective buyer

1. Do they start from property price, payment amount or income capacity?
2. What does “how much can I buy?” mean to them: bank maximum or personally sustainable range?
3. How do they compare renting and buying?
4. Which financing concepts create the most confusion?
5. What motivates profile completion?

### Payment-pressure/legal user

1. At what stage do they seek help?
2. Which terms do they use for collections, arrears, restructuring and legal action?
3. Do they know whether their product is housing credit, leasing or another secured loan?
4. What information creates urgency vs panic?
5. What would make them trust an automated preliminary route?

## Research streams

### Stream A — Market language mining

Sources:

- TikTok comments on mortgage/Ley 546 creators;
- YouTube comments;
- Colombian Reddit/financial communities;
- Google query/autocomplete/related searches;
- competitor FAQs;
- bank help centers;
- financial consumer complaints and public decisions where usable.

Capture verbatim phrases, not expert paraphrases.

Output taxonomy:

- trigger;
- desired outcome;
- misconception;
- objection;
- trust signal;
- vocabulary;
- emotional state;
- action currently taken.

### Stream B — Competitive UX teardown

Review current Colombian products and selected international analogues.

For each surface capture:

- entry promise;
- first required input;
- time to first value;
- identity gate;
- financial-data gate;
- result quality;
- assumptions/provenance;
- next action;
- monetization visibility;
- mobile behavior;
- trust/disclosure pattern;
- visual language;
- strengths to learn from;
- patterns to avoid.

### Stream C — Moderated user interviews

Initial target:

- 5–7 existing housing-loan borrowers;
- 4–5 prospective buyers;
- 3–4 users with recent payment difficulty or bank dispute if recruitable ethically.

This is directional, not statistically representative.

Interview structure:

1. Tell me the last time you thought about your housing loan/home purchase.
2. What did you do first?
3. Show how you currently understand your payment/statement.
4. What would make you search for help?
5. What would make a website feel suspicious?
6. Prototype task.
7. Comprehension check.
8. Data-sharing willingness ladder.
9. Assisted vs DIY preference.

Do not teach concepts before asking baseline questions.

### Stream D — Prototype usability

Test representative flows in low fidelity before visual polish.

Tasks:

#### Borrower

- calculate impact of paying extra monthly;
- explain where projected savings come from;
- decide whether to upload statement;
- find DIY instructions;
- identify what is estimate vs bank decision.

#### Buyer

- estimate sustainable property range;
- identify what could improve the profile;
- distinguish “estimated range” from approval.

#### Problem

- classify payment difficulty;
- identify next step;
- understand whether lawyer is required now.

Measures:

- task success;
- time/hesitation;
- misinterpretations;
- terminology failures;
- confidence rating;
- data-sharing willingness;
- next-action comprehension.

### Stream E — Live funnel research

After first launch:

- form field abandonment;
- upload conversion by prior value delivered;
- CTA choice DIY vs assisted;
- result assumption expansion rate;
- help/support questions;
- repeat visits;
- channel-specific conversion.

Do not infer user intent solely from click data; pair analytics with qualitative evidence.

## Hypotheses to test explicitly

### H1
Users will upload a bank statement at a materially higher rate after receiving a useful preliminary result than before any result.

### H2
Showing exactly where projected savings come from increases trust even if the headline saving feels smaller.

### H3
A “sustainable range” positioning differentiates VIVIENDA from bank maximum-preapproval tools and improves perceived independence.

### H4
Users value being told when a bank action can be performed directly/free, and this increases later willingness to pay for complex assistance.

### H5
“Loan Health” or equivalent creates a clearer ongoing mental model than a one-time “Ley 546 study.”

### H6
Users prefer action-based choices (pay extra / transfer / keep current) over product/legal taxonomy.

### H7
A calm “I am having trouble paying” pathway converts higher-quality legal/financial leads than fear-based debt messaging.

## Data-sharing willingness ladder

Test willingness progressively:

1. anonymous numeric inputs;
2. save result with email/passkey/account;
3. income/debt profile;
4. phone/contact;
5. bank name/product;
6. bank statement;
7. identity document;
8. signed financial authorization;
9. professional legal engagement/power.

Measure where trust breaks and what explanation restores it.

## Trust comprehension tests

After a result, ask user in their own words:

- Is this guaranteed?
- Who decides whether a loan is approved?
- Why did the projected interest change?
- What information came from you vs the bank/document?
- What could you do without paying VIVIENDA?
- What would happen next if you ask for help?

If users answer incorrectly, UI/copy has failed regardless of aesthetic quality.

## Research repository

Future artifacts:

- `knowledge/30_RESEARCH/VERBATIM-LANGUAGE.md`
- `knowledge/30_RESEARCH/COMPETITIVE-UX-BENCHMARK.md`
- `knowledge/30_RESEARCH/INTERVIEW-GUIDE.md`
- `knowledge/30_RESEARCH/USABILITY-TEST-SCRIPT.md`
- `knowledge/30_RESEARCH/FINDINGS-LOG.md`

Record source dates because rates, bank flows and regulations change.

## Ethical/privacy rules for research

- obtain informed participation consent;
- do not request real bank credentials;
- redact statements/screenshots used in research artifacts;
- avoid storing unnecessary personally identifying financial data;
- do not recruit users in acute legal distress into manipulative sales research;
- separate user-research participation from legal-service representation decisions.

## Research-to-decision rule

A research finding should identify:

- evidence/source;
- affected journey/surface;
- confidence;
- design/product implication;
- decision made or experiment proposed.

Do not accumulate “interesting insights” without changing a decision or test.