# VIVIENDA

Plataforma colombiana para tomar y ejecutar mejores decisiones financieras y jurídicas alrededor de la vivienda.

## Tesis

VIVIENDA acompaña el ciclo:

**Preparar → Comprar → Financiar → Administrar → Optimizar → Proteger**

No nace como portal inmobiliario, banco, central de riesgo ni landing de Ley 546. La tesis central es construir una capa de inteligencia y ejecución que ayude a entender qué conviene hacer con la financiación de vivienda y permita avanzar cuando el usuario decide actuar.

## Cuña inicial

El primer usuario prioritario es quien ya tiene crédito de vivienda/leasing y se pregunta:

> ¿Estoy pagando mi vivienda de la mejor manera disponible para mí?

Entrada secundaria: personas que quieren saber cuánto pueden comprar de forma sostenible y cómo prepararse para financiar vivienda.

## Principios

- valor antes de pedir datos sensibles;
- decisiones antes que catálogo de productos;
- costo total además de cuota;
- cálculos explicables y con fuentes;
- distinguir simulación, recomendación, oferta y aprobación;
- mostrar cuándo el usuario puede hacer algo directamente y gratis;
- asistencia pagada donde realmente agrega valor;
- mobile-first;
- accesibilidad y performance desde foundation;
- separación clara entre flujos comerciales/financieros y relación profesional jurídica.

## Foundation docs

- [`PRODUCT.md`](PRODUCT.md) — contexto canónico de producto.
- [`AGENTS.md`](AGENTS.md) — contrato de trabajo para agentes.
- [`design-skills.lock.json`](design-skills.lock.json) — registro curado de skills.
- [`skills/housing-finance-design-orchestrator/SKILL.md`](skills/housing-finance-design-orchestrator/SKILL.md) — orquestador local de UX/diseño/CRO/frontend.
- [`skills/UPSTREAM-PINS.md`](skills/UPSTREAM-PINS.md) — upstreams inspeccionados y pins.
- [`knowledge/00_PRODUCT/MVP-SCOPE.md`](knowledge/00_PRODUCT/MVP-SCOPE.md) — alcance MVP y gates.
- [`knowledge/00_PRODUCT/INFORMATION-ARCHITECTURE.md`](knowledge/00_PRODUCT/INFORMATION-ARCHITECTURE.md) — IA propuesta.
- [`knowledge/00_PRODUCT/JOURNEY-MAP.md`](knowledge/00_PRODUCT/JOURNEY-MAP.md) — journeys iniciales.
- [`knowledge/20_DESIGN/DESIGN-OPERATING-MODEL.md`](knowledge/20_DESIGN/DESIGN-OPERATING-MODEL.md) — proceso de diseño.
- [`knowledge/20_DESIGN/VISUAL-DISCOVERY-BRIEF.md`](knowledge/20_DESIGN/VISUAL-DISCOVERY-BRIEF.md) — brief para explorar dirección visual.
- [`knowledge/30_RESEARCH/UX-RESEARCH-PLAN.md`](knowledge/30_RESEARCH/UX-RESEARCH-PLAN.md) — plan de investigación UX.
- [`knowledge/30_RESEARCH/COMPETITIVE-UX-BENCHMARK.md`](knowledge/30_RESEARCH/COMPETITIVE-UX-BENCHMARK.md) — benchmark actual de mercado.
- [`.agents/product-marketing-context.md`](.agents/product-marketing-context.md) — contexto compartido para marketing/CRO/copy.

## Estado

Foundation de producto/diseño en construcción. No existe todavía un frontend público ni un `DESIGN.md` congelado: la dirección visual debe salir de discovery, wireframes y una muestra representativa antes de convertirse en sistema.

## Próximo bloque

1. cerrar research y lenguaje real de usuarios;
2. definir contratos de cálculo del primer producto;
3. diseñar low-fi del borrower journey;
4. explorar tres territorios visuales;
5. validar un vertical slice: home + calculadora + Perfil + Mortgage Twin + mobile;
6. solo entonces scaffold/implementación y design system definitivo.
