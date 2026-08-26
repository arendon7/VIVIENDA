# WARM PATH QUALITY AUDIT

Use this as the pre-merge gate for visual/product surfaces.

## Scoring
Each item: 0 fail / 1 partial / 2 pass.
Any hard-fail item blocks release regardless of total.

## A. Truth and trust — 20
- [ ] Precision C0-C3 shown where relevant.
- [ ] Simulation cannot be mistaken for offer or approval.
- [ ] Source/freshness visible for external claims.
- [ ] Assumptions accessible from result.
- [ ] DIY route visible when valid.
- [ ] Commercial relationship disclosed when it can influence ranking/availability.
- [ ] Additional principal not labeled platform-created savings.
- [ ] AI extraction is reviewable/correctable.
- [ ] No guarantee language.
- [ ] Legal screen is distinct from professional conclusion.

Hard fails: hidden sponsorship; false approval; unsupported guaranteed savings.

## B. Comprehension — 16
- [ ] Main conclusion understandable in <10 seconds.
- [ ] User can identify current state, action and modeled effect.
- [ ] Benefit Breakdown labels are mutually understandable.
- [ ] Financial units are explicit.
- [ ] Rate basis explicit (EA etc.) when shown.
- [ ] Uncertainty is plain language, not only badge color.
- [ ] Long explanations use progressive disclosure.
- [ ] Empty/unknown data degrades gracefully.

Hard fail: user contribution visually counted as professional savings.

## C. Agency and conversion — 12
- [ ] Primary next action matches user goal.
- [ ] No identity/contact gate before first useful result unless functionally required.
- [ ] Back/edit is available in intake.
- [ ] Legitimate non-commercial path is not visually sabotaged.
- [ ] Upload request states purpose before permission.
- [ ] User can abandon without losing already-earned anonymous result.

## D. Accessibility — 20
- [ ] Semantic heading structure.
- [ ] Explicit input labels.
- [ ] Keyboard complete.
- [ ] Visible focus.
- [ ] Contrast meets WCAG AA for normal text/control states.
- [ ] Status not color-only.
- [ ] Errors programmatically associated.
- [ ] Recalculation announced appropriately.
- [ ] Reduced-motion behavior.
- [ ] Charts/path have text equivalents.

Hard fails: inaccessible primary action; keyboard trap; color-only critical meaning.

## E. Responsive/mobile — 12
- [ ] No horizontal page scroll at QA viewports.
- [ ] Currency does not clip.
- [ ] Touch targets >=44px.
- [ ] Scenario Path converts cleanly to vertical.
- [ ] Source/precision survive mobile hierarchy.
- [ ] Sticky CTA does not hide disclosures.

## F. Visual craft — 10
- [ ] Hierarchy does not rely on excessive card nesting.
- [ ] Spacing rhythm follows tokens.
- [ ] Financial numbers align and use tabular numerals.
- [ ] Blue/green/amber retain semantic meaning.
- [ ] Motion explains state/consequence, not decoration.

## G. Performance/perceived performance — 10
- [ ] Anonymous calculation avoids unnecessary server roundtrip when safe.
- [ ] Above-fold UI does not depend on heavy charting library.
- [ ] Fonts do not cause disruptive layout shift.
- [ ] Result skeletons are used only for real waits.
- [ ] Large document/OCR work has progress and cancellation/recovery behavior.

## Thresholds
- 90-100: release candidate
- 82-89: acceptable only if no item below 1 and no hard fail
- <82: revise

## Mandatory adversarial review prompts
1. Where could a user infer certainty that we do not possess?
2. Where could commission economics distort recommendation hierarchy?
3. What happens when every optional input is unknown?
4. What happens with very large Colombian currency values?
5. What happens at 360 px width and 200% text zoom?
6. Can a keyboard-only user complete the entire journey?
7. Does the design still explain the result with motion disabled?
8. Is there any place where a persuasive treatment hides methodology?
9. Could a user believe a partner offer is approval?
10. Can the user correct an OCR mistake before it affects a decision?