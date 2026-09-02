# PREPAYMENT CHOICE COMPARISON CONTRACT — V0.22

## 1. Pregunta de producto

v0.22 responde una pregunta específica del Existing Borrower:

> **Si aplico el mismo abono parcial inmediato a capital, ¿cómo cambia mi crédito si pido reducir plazo frente a reducir cuota?**

La comparación no elige por el usuario. Expone dos consecuencias financieras modeladas bajo el mismo punto de partida.

## 2. Alcance soportado

El modelo v0.22 aplica únicamente cuando existe un contrato C2 compatible para:

- crédito hipotecario de vivienda;
- modalidad en pesos;
- sistema de cuota constante en pesos;
- saldo de capital positivo;
- tasa efectiva anual explícita y válida;
- número positivo de cuotas restantes;
- abono único inmediato mayor que cero y menor que el saldo de capital.

UVR, leasing habitacional y otros sistemas no heredan este modelo por analogía.

## 3. Supuestos explícitos

Para comparar R1 y R2 se mantiene constante:

- el mismo saldo inicial;
- la misma tasa EA;
- el mismo sistema de amortización;
- el mismo número original de cuotas restantes;
- exactamente el mismo abono parcial;
- aplicación del abono directamente a capital antes de la siguiente cuota.

Solo cambia la instrucción posterior al abono.

## 4. Alternativa R1 — reducir plazo

Después del abono:

- se conserva la cuota financiera modelada del baseline;
- se recalcula el número de cuotas necesarias para extinguir el saldo;
- se reportan plazo resultante, reducción de plazo e interés nominal futuro evitado bajo el modelo.

La reducción de plazo no implica que el banco haya aceptado una instrucción real ni que exista una liquidación contractual verificada.

## 5. Alternativa R2 — reducir cuota

Después del mismo abono:

- se conserva el número de cuotas restantes;
- se recalcula la cuota financiera sobre el nuevo saldo;
- se reportan nueva cuota modelada, reducción mensual, reducción porcentual e interés nominal futuro evitado bajo el modelo.

## 6. Precisión y provenance

- Mortgage Twin base transcrito por el usuario: **C1**.
- Resultado determinístico compatible de R1: **C2 local a R1**.
- Resultado determinístico compatible de R2: **C2 local a R2**.
- Construir R1/R2 C2 no eleva el Mortgage Twin completo ni R3/R5/R7/R10.
- No existe C3 en este slice.

La precisión pertenece a la decisión y al modelo que realmente la ganó.

## 7. Invalidación fail-closed

Un resultado C2 debe invalidarse cuando cambia un input material del modelo o el abono comparado. La UI no conserva badges C2 obsoletos.

Si la comparación deja de estar vinculada a los datos actuales:

- desaparecen los estados R1/R2 C2 correspondientes;
- Loan Health vuelve al estado cualitativo compatible;
- la ruta vuelve a C1 hasta construir un nuevo modelo compatible.

Los escenarios de abono mensual y de abono único son modelos distintos y conservan precisión independiente.

## 8. Truth boundaries

El resultado NO es:

- liquidación emitida por la entidad financiera;
- ahorro garantizado;
- oferta bancaria;
- aprobación, elegibilidad o probabilidad de aprobación;
- recomendación universal de reducir plazo o cuota;
- conclusión jurídica;
- instrucción ya radicada;
- evidencia C3.

El capital aportado por el usuario nunca se presenta como ahorro generado por VIVIENDA.

## 9. Fuera de alcance

- UVR;
- leasing habitacional;
- tasas variables o indexadas no modeladas;
- seguros y cargos operativos dentro de la cuota total;
- calendarios reales de aplicación del banco;
- costos de transacción;
- impuestos;
- modificación contractual automática;
- radicación;
- persistencia productiva;
- OCR o verificación documental productiva.

## 10. Acceptance criteria

El slice se considera cerrado únicamente si:

1. el mismo abono alimenta R1 y R2;
2. R1 conserva cuota modelada y reduce plazo;
3. R2 conserva plazo y reduce cuota;
4. los cálculos determinísticos tienen tests de dominio;
5. un abono inválido falla cerrado;
6. cambiar el monto invalida los C2 anteriores;
7. una situación profesional/procesal mantiene precedencia sobre optimización;
8. la comparación no elige por el usuario;
9. desktop y 390 px no presentan overflow horizontal;
10. TypeScript, dominio, build y Playwright quedan full green sobre el SHA de freeze.
