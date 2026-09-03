# VIVIENDA — Borrower Funnel Analytics Contract V0.1

## Principle

Analytics must measure whether users understand and act on value, not merely whether VIVIENDA captures contact details.

Do not send raw financial values, document contents, identification numbers or sensitive free text to general-purpose analytics platforms unless a separately approved privacy architecture explicitly permits it.

## Core funnel

### `borrower_entry_viewed`
Properties:
- source_family: organic / paid / influencer / referral / direct / internal
- landing_variant
- device_class

### `borrower_check_started`
Properties:
- entry_surface

### `borrower_step_completed`
Properties:
- step_id
- answer_category when non-sensitive and safely bucketed
- elapsed_bucket

Do not send precise balance/payment as analytics properties.

### `borrower_check_completed`
Properties:
- precision_class: C1/C2
- modality_known: boolean
- rate_known: boolean
- completion_time_bucket

Primary activation event for anonymous borrower acquisition.

### `quick_check_result_viewed`
Properties:
- precision_class
- opportunity_count_bucket
- primary_opportunity_type
- missing_data_count

### `precision_explainer_opened`
Measures trust/uncertainty engagement.

### `prepayment_simulation_started`
Properties:
- mode: lump_sum / recurring
- objective: reduce_term / reduce_payment / compare
- precision_class

### `prepayment_simulation_completed`
Properties:
- precision_class
- term_reduction_bucket
- benefit_bucket

Financial values must be coarse buckets if analytics needs them at all.

### `benefit_breakdown_viewed`
Key signal that the user saw how the benefit is composed.

### `benefit_methodology_opened`

### `next_action_viewed`

### `next_action_selected`
Properties:
- action: diy / improve_precision / compare / legal_screen / leave

This is more meaningful than “lead generated.”

## DIY metrics

### `diy_steps_opened`
### `diy_checklist_saved`
### `diy_bank_instruction_viewed`

A healthy product may intentionally create successful sessions that produce no paid conversion.

## Account conversion

### `account_prompt_viewed`
Property:
- trigger: save / monitor / upload / compare / return

### `account_creation_started`
### `account_creation_completed`

Track conversion from demonstrated value, not from first page view.

## Document flow

### `upload_explainer_viewed`
### `privacy_details_opened`
### `document_upload_started`
### `document_upload_completed`
Properties:
- document_type
- page_count_bucket

Never log file name if it could contain identity information.

### `extraction_completed`
Properties:
- high_confidence_fields_count
- review_required_fields_count
- missing_fields_count

### `extraction_field_corrected`
Properties:
- field_type
- confidence_bucket

Never log the corrected value.

### `extraction_confirmed`

## Mortgage Twin

### `mortgage_twin_created`
Properties:
- precision_class
- source_mix

### `mortgage_twin_viewed`
### `opportunity_opened`
Properties:
- opportunity_type
- confidence_class

## Commercial / financial execution

### `comparison_started`
### `partner_option_viewed`
### `partner_disclosure_opened`
### `application_handoff_started`
### `application_handoff_completed`

Approval or rejection events, if received from partners, must be stored with appropriate consent and separated from general marketing analytics.

## Legal transition

### `legal_screen_triggered`
Internal system event; do not treat as legal conclusion.

### `legal_screen_explainer_viewed`
### `professional_review_requested`
### `professional_relationship_started`

The commercial attribution system must not calculate influencer/commercial compensation from legal professional fees without separate legal/compliance approval.

## Trust metrics

Measure at least:
- precision explainer open rate;
- Benefit Breakdown view rate;
- DIY route selection rate;
- correction rate after OCR;
- abandonment specifically at identity/account request;
- abandonment at upload request;
- return-to-saved-analysis rate;
- percentage of users who correctly identify result type in usability study.

## Suggested north-star family

Do not freeze one north-star metric yet. Candidate family:

### `qualified_decision_session`
A session where the user:
1. completes Quick Check;
2. views at least one scenario or decision explanation;
3. reaches a next-action choice.

This recognizes value even when the chosen action is DIY.

## Experiment guardrails

No CRO experiment may:
- hide estimate/simulation status;
- remove commercial disclosures;
- make DIY intentionally harder to find;
- demand contact before anonymous result merely to increase lead count;
- use fabricated scarcity;
- change financial/legal claims without compliance review.

## Data minimization

Default analytics properties should be categorical/bucketed.

Examples:
- balance_bucket rather than exact balance;
- term_bucket rather than exact remaining months where aggregation suffices;
- no document text;
- no names/phones/emails in event properties;
- no account IDs in third-party analytics unless pseudonymized under approved policy.
