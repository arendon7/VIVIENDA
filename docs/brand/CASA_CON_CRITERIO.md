# Casa con Criterio — Brand System V1

Status: canonical working identity for the VIVIENDA product.

## 1. Masterbrand
**Casa con Criterio**

Wordmark rule:
- `CASA` and `CRITERIO` are the dominant words.
- `con` is smaller and sits to the right of `CASA`, not below it.
- The approved symbol is a house outline containing two interlocked `C` forms.

## 2. Core lines
- Brand belief: **Tu vivienda merece criterio.**
- Commercial line: **Conoce las reglas. Haz las cuentas. Decide con criterio.**
- Institutional descriptor: **Inteligencia para las decisiones de tu vivienda.**

## 3. Canonical palette
- Deep navy: `#0B1D2D`
- Patrimonial ochre: `#C7922F`
- Soft green: `#6F8F7A`
- Mist gray: `#BFC7D1`
- Warm ivory: `#F6F3EC`

## 4. Typography
- Editorial / display: Lora
- Interface / numbers: Work Sans

No font files are stored in the repository. The app uses `next/font/google`.

## 5. Visual language
Casa con Criterio combines Warm Path with an editorial-patrimonial layer:
- warm mineral backgrounds;
- strong financial numbers;
- architectural line patterns;
- ochre as opportunity/emphasis, never as a guarantee;
- green only for genuinely favorable or completed states;
- navy for authority, navigation and primary actions.

## 6. Product vocabulary
Masterbrand remains single. Product experiences include:
- **Mi Vivienda** — longitudinal home profile;
- **Mi Situación** — current context;
- **Radar Vivienda** — opportunities and issues worth exploring;
- **Mis Escenarios** — comparison of consequences;
- **Crédito en Claro** — understanding the current obligation;
- **Comprar con Criterio** — buyer journey;
- **Casa con Criterio** can also name the editorial/content layer when context makes the distinction clear.

## 7. Commercial voice
The brand may be commercially provocative when evidence supports the hook.

Examples:
- `Tu banco ya hizo las cuentas. Ahora haz las tuyas.`
- `El mismo abono. Dos decisiones.`
- `¿Qué oportunidad hay escondida en tus números?`
- `Una tasa menor no siempre gana.`

Pattern:
**tension → explanation → evidence/model → user decision**.

Never convert a modeled opportunity into a claim of realized savings.

## 8. Product truth rules that branding cannot override
- C0/C1/C2/C3 precision remains explicit.
- User-supplied principal is not platform-generated savings.
- A simulation is not a bank offer or approval.
- Legal orientation is not automatically a final legal conclusion.
- Commercial relationships cannot silently alter analysis.
- Free/DIY routes remain visible where legitimately available.

## 9. Implementation
Brand assets live in `public/brand/`.
Brand-specific CSS lives in `styles/casa-criterio.css` and layers over the existing `app/globals.css` Warm Path system.

Shared product chrome lives in `components/brand/ProductChrome.tsx`:
- `ProductHeader` for consistent masterbrand and route navigation;
- `ProductFooter` for surface-specific truth boundaries;
- `ProductIntro` for the route-level commercial/context statement.

Operate-form grammar is centralized in the Casa con Criterio layer:
- visible focus states;
- restrained ochre selection state;
- warm inputs and choice surfaces;
- legible disabled states;
- tabular numeric rhythm;
- mobile product navigation contained within its own horizontal scroll region when necessary.

The shared chrome is now used across the Quick Check, buyer preparation/affordability/financing/quote-comparison flows, payment-pressure triage, reconciliation, verification, Mi Vivienda and Auditoría Hipotecaria.

This branch is a visual/brand integration branch only. It must not weaken product, legal, evidence or calculation contracts.
