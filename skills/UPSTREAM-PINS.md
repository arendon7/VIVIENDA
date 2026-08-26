# VIVIENDA — Reviewed Skill Upstream Pins

Reviewed: 2026-08-25

Purpose: record immutable upstream states that were inspected during foundation work. This does not mean every upstream repository is vendored or automatically trusted forever.

## Reviewed core upstreams

| Upstream | Reviewed commit | Role |
|---|---|---|
| `vercel-labs/agent-skills` | `dd089a8c752c966dee8bf0f27cb625ba193ffd9e` | web design, React performance, composition |
| `microsoft/skills` | `cfa296e20a1c35f27e6ee27678dcbd905d81954b` | frontend design review |
| `coreyhaines31/marketingskills` | `becd60ee9df07f7d595c26e092253ba49f7a9ffc` | marketing context, offers, form/onboarding/page CRO |
| `pbakaus/impeccable` | `fcd7622cd2d8e2b09344ba8ede9fcac82cec4e70` | holistic UX/UI shaping, critique and hardening |
| `Leonxlnx/taste-skill` | `ccbc15639c97057cbfcf32ecebc38ef716e4bb37` | marketing/landing anti-generic design direction |

## Important review notes

### Taste scope

The inspected `design-taste-frontend` skill explicitly states that it targets landing pages, portfolios and redesigns and is not intended as the primary lens for dashboards, data tables or multi-step product UI. VIVIENDA encodes this limitation in its local orchestrator.

### Vercel Agent Skills

The reviewed repository publishes multiple independent skills. VIVIENDA currently routes specifically to:

- `web-design-guidelines`
- `react-best-practices`
- `composition-patterns`

Do not import unrelated Vercel skills merely because they share the repository.

### Marketing Skills disclosure

The inspected marketing-skills repository currently contains a disclosed partner mechanism. VIVIENDA should use the reasoning frameworks, not silently import third-party commercial integrations or let sponsor relationships alter product/tool choices.

### Impeccable

The reviewed current repository includes generated/provider-specific output and active tooling. Use its documented skill behavior; do not execute arbitrary scripts against VIVIENDA without reviewing what they do and why they are needed.

## Installation policy

When a local development environment is scaffolded, candidate project-level installation commands may include:

```bash
npx skills add vercel-labs/agent-skills@web-design-guidelines -y
npx skills add vercel-labs/agent-skills@react-best-practices -y
npx skills add vercel-labs/agent-skills@composition-patterns -y
npx skills add microsoft/skills@frontend-design-review -y
npx skills add coreyhaines31/marketingskills@product-marketing-context -y
npx skills add coreyhaines31/marketingskills@offers -y
npx skills add coreyhaines31/marketingskills@form-cro -y
npx skills add coreyhaines31/marketingskills@onboarding-cro -y
npx skills add coreyhaines31/marketingskills@page-cro -y
```

Impeccable/Taste/other specialist installation must follow their current installation instructions after checking the pinned/upstream state.

The actual installed set should remain smaller than the discovery set. A skill becomes an operational dependency only when:

1. it solves a recurring project need;
2. its source is reviewed;
3. overlap with existing skills is acceptable;
4. its outputs are compatible with VIVIENDA governance;
5. it is recorded in `design-skills.lock.json`.

## Update protocol

Before updating a pinned skill:

1. inspect upstream diff since reviewed commit;
2. inspect the relevant `SKILL.md` changes;
3. check new scripts/dependencies/integrations;
4. assess whether routing or precedence changed;
5. test on one representative task;
6. update pin and decision log only after review.

Never run a blanket skill update immediately before a release freeze.