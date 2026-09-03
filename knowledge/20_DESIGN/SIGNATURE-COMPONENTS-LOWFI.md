# VIVIENDA — Signature Components Low‑Fi Contract V0.1

These components are the intended recognizable product language of VIVIENDA. They should be designed before generic decorative sections because they carry the differentiation.

## 1. Decision Result

### User question
“What should I consider doing next, and why?”

### Required anatomy
- decision label
- concise recommendation sentence
- confidence/precision class
- 2–4 reasons
- expected direction of effect
- what could change the recommendation
- source/freshness
- primary action
- alternative action

### Example low-fi

[Possible best next step]
Compare purchase-of-portfolio options

Why it appears
- rate looks high relative to current references
- remaining term is long
- balance is large enough for rate difference to matter

[Modeled, not an offer]

CTA: Compare alternatives
Secondary: Keep my current credit

### Never
- use a single mysterious score without explanation;
- show partner ordering as recommendation without ranking rationale;
- imply approval.

---

## 2. Benefit Breakdown

### User question
“Where does the economic effect actually come from?”

### Required anatomy
- user extra principal
- baseline modeled future interest
- scenario modeled future interest
- interest avoided
- other costs avoided if modeled
- implementation cost
- net modeled benefit
- term/instalment effect
- assumptions

### Visual logic
The user contribution and avoided cost must be structurally separated, not merely different colors in the same “savings” bar.

Recommended low-fi structure:

YOUR DECISION
Capital you would pay earlier       COP X

MODELED EFFECT
Interest without change             COP A
Interest with change                COP B
Interest that would not accrue      COP A-B

OTHER EFFECTS
Insurance / costs                   COP C
Execution cost                      COP D

NET MODELED EFFECT                   COP E

### Comprehension gate
A user seeing only this component should be able to explain that the capital contribution is theirs.

---

## 3. Source + Freshness

### User question
“Where did this number/rule come from and how current is it?”

### Required anatomy
- source name
- source type: public reference / user / document / partner / calculation
- effective or observed date
- retrieval/update date
- scope qualifier
- open-details affordance

Example:
FNA · Public reference
Effective: 20 Aug 2026
Retrieved: 25 Aug 2026
Not a personalized offer

### Freshness states
- current
- review soon
- stale
- unknown

Do not use color alone.

---

## 4. Scenario Path

### User question
“How does this decision change the life of my credit?”

### Required anatomy
- today marker
- current path
- scenario path
- payoff/date or milestone
- event markers
- optional cost/interest cumulative view
- difference label

### Modes
- baseline vs prepayment
- current bank vs portfolio purchase
- normal payment vs restructuring scenario
- buyer: rent/save now vs buy later

### Interaction
Hover/focus/tap may reveal period details, but the core conclusion must be legible without interaction.

### Accessibility
Provide a textual equivalent containing the same milestones and differences.

---

## 5. DIY / Assisted Choice

### User question
“Can I do this myself, and what would assistance add?”

### Required anatomy
DIY route:
- what user can do
- direct institution
- expected cost to VIVIENDA: zero when applicable
- checklist

Assisted route:
- what VIVIENDA actually adds
- price/model when known
- expected process

Professional legal route:
- separate visual boundary
- professional relationship disclosure
- separate fee basis

### Dark-pattern prohibition
Paid route cannot win by:
- much larger button;
- hidden DIY link;
- warning-colored DIY path;
- fake urgency;
- misleading “recommended” badge based on commercial value.

---

## 6. Mortgage Twin Snapshot

### User question
“What is the current state of my credit?”

### Required anatomy
- outstanding principal
- installment
- rate
- monetary modality
- amortization system
- remaining term
- insurance/costs where known
- data cutoff date
- precision/source state
- last refresh
- active opportunities
- recent/next events

### Hierarchy
The twin is not a dashboard full of equal cards.

Tier 1:
- balance
- payment
- rate
- remaining horizon

Tier 2:
- system/modality
- insurance
- next event

Tier 3:
- opportunities/history/documents

### Snapshot state
Must visibly distinguish:
- user-declared only;
- modeled;
- verified from document;
- stale document.

---

## 7. Precision Ladder

### User question
“How much should I trust this result?”

States:
- C0 Orientation
- C1 Estimate
- C2 Modeled
- C3 Document-verified

Required for each state:
- plain-language label
- what data exists
- what is missing
- what action upgrades precision

Do not represent confidence as a pseudo-scientific percentage such as 87% unless a real calibrated model exists.

---

# Cross-component rules

1. Every monetary conclusion exposes its result type.
2. Every external reference exposes freshness.
3. Every recommendation can explain why it appeared.
4. Every paid action has a visible alternative when one exists.
5. Every complex visual has a text equivalent.
6. Components should work in grayscale before visual styling.
7. Components should survive mobile width without turning into horizontal data tables.
8. Components should compose; do not create unique ad-hoc card styling per use case.

# High-fi acceptance

A visual territory cannot be selected unless it produces credible variants of at least:
- Decision Result;
- Benefit Breakdown;
- Scenario Path;
- Mortgage Twin;
- Source + Freshness.

A territory that only makes the marketing hero attractive fails the product test.
