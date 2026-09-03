# VIVIENDA — Borrower UX Copy Contract V0.1

Purpose: keep product, CRO, design and legal language consistent across the borrower journey.

## Voice

VIVIENDA should sound:
- clear;
- calm;
- competent;
- non-paternalistic;
- numerically precise when the data supports precision;
- explicit about uncertainty when it does not.

Avoid sounding:
- like a bank approval engine;
- like a debt-relief telemarketer;
- like a litigation firm looking for conflict;
- like a financial influencer promising hacks.

## Core vocabulary

Use consistently:
- saldo
- cuota
- plazo restante
- tasa
- modalidad
- sistema de amortización
- abono a capital
- estimación
- simulación
- dato verificado
- referencia pública
- oferta real
- aprobación de la entidad
- beneficio modelado
- intereses que dejarían de causarse

Avoid as generic shorthand:
- ahorro garantizado
- bajar deuda mágicamente
- beneficio Ley 546 for every optimization
- score crediticio unless it is actually a bureau score

## Precision language

### C1 — Estimate
Preferred:
“Con los datos que nos diste podemos hacer una primera estimación.”

Not:
“Este es tu ahorro.”

### C2 — Modeled simulation
Preferred:
“Modelamos este escenario usando la tasa, plazo y sistema que indicaste.”

### C3 — Document verified
Preferred:
“Confirmamos estos datos con tu extracto del [fecha de corte].”

## Result headlines

Good candidates:
- “Ya podemos ubicar tu crédito.”
- “Hay un escenario que vale la pena comparar.”
- “Con estos datos podemos modelar cuánto cambia el plazo.”
- “Antes de hablar de ahorro, necesitamos confirmar dos datos.”

Avoid:
- “¡Felicidades! Puedes ahorrar $48 millones.”
- “Descubrimos dinero escondido en tu hipoteca.”
- “Tu banco te está cobrando de más” before evidence exists.

## Benefit Breakdown

Mandatory core explanation:
“Tu aporte adicional no es ahorro: es capital que decides pagar antes. El beneficio modelado proviene de los intereses y otros costos que dejarían de causarse.”

Label order:
1. “Capital adicional que aportarías”
2. “Intereses futuros sin el cambio”
3. “Intereses futuros con el cambio”
4. “Intereses que dejarían de causarse”
5. “Otros costos que podrían evitarse” only with assumptions/source
6. “Costo de ejecutar el cambio” if applicable
7. “Beneficio neto modelado”

## DIY route

Preferred:
“Puedes solicitar este cambio directamente a tu entidad. Te mostramos qué pedir y qué revisar.”

When known to be free:
“Este trámite puede hacerse directamente con tu entidad sin pagarle a VIVIENDA.”

Avoid making self-service intentionally visually weak.

## Upload

Before upload:
“Usaremos tu extracto para confirmar saldo, tasa, modalidad, plazo, seguros y fecha de corte.”

Security:
“Nunca necesitamos tu contraseña, token ni claves bancarias.”

After extraction:
“Encontramos estos datos. Revísalos antes de que los usemos para calcular.”

Low confidence:
“No pudimos leer este dato con suficiente seguridad.”

Conflict:
“El extracto muestra dos valores que podrían corresponder a conceptos distintos. Necesitamos confirmarlo.”

## UVR

Preferred:
“Podemos modelar la obligación en UVR. Para convertir pagos futuros a pesos necesitamos asumir cómo evolucionaría la UVR; por eso no presentamos esa cifra como si ya fuera conocida.”

Avoid:
“Tu cuota subirá X%” without explicit scenario assumptions.

## Comparison / marketplace

Public reference:
“Tasa pública de referencia. No es una oferta para ti.”

Personalized estimate:
“Compatibilidad estimada según los datos de tu perfil.”

Partner offer:
“Oferta informada por la entidad/aliado para este proceso.”

Approval:
“La aprobación y condiciones finales dependen exclusivamente de la entidad financiera.”

Commercial disclosure:
“Podemos recibir una remuneración del aliado si contratas a través de VIVIENDA. Esto no cambia el orden del resultado sin que te expliquemos el criterio de ranking.”

## Legal route

Automated screening:
“Detectamos una situación que podría requerir revisión jurídica. Esto todavía no es un concepto legal profesional.”

Professional transition:
“Si decides solicitar revisión jurídica, comienza una relación profesional separada con el abogado que acepte el caso.”

Never:
- imply that the automated screen is legal advice;
- guarantee a favorable bank/court outcome;
- hide professional fees behind financial-result language.

## Errors

Principle: explain cause category + next recovery action.

Bad:
“Error 422.”

Good:
“No pudimos calcular porque la cuota informada es menor que el interés que produciría el saldo con esa tasa. Revisa los datos o usa tu extracto para confirmarlos.”

## Consent

Do not write:
“Al continuar aceptas todo.”

Prefer purpose-specific language near the action:
“Al subir este documento autorizas su uso para extraer los datos necesarios para analizar tu crédito. Podrás revisar los datos antes del cálculo.”

Full legal text remains accessible but should not replace plain-language purpose disclosure.

## CTA hierarchy

Use action language, not marketing language.

Preferred:
- Revisar mi crédito
- Ver escenario
- Simular un abono
- Ver de dónde sale el beneficio
- Ver pasos para hacerlo yo
- Mejorar precisión
- Confirmar datos
- Comparar alternativas
- Solicitar revisión jurídica

Avoid:
- Quiero ahorrar ya
- Reclama tus millones
- Activar beneficio
- Ganar reducción

## Copy acceptance

Before shipping any surface:
- user can distinguish estimate from approval;
- user can identify who supplies extra principal;
- user understands why document upload is requested;
- user understands when a route is DIY;
- legal screening is not confused with legal advice;
- no superlative or savings claim exists without evidence and scope.
