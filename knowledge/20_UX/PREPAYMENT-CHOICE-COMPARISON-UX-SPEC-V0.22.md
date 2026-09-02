# PREPAYMENT CHOICE COMPARISON UX SPEC — V0.22

## 1. Objetivo

Permitir que un usuario con Mortgage Twin compatible compare el **mismo abono parcial inmediato** bajo dos instrucciones distintas: reducir plazo o reducir cuota, sin convertir el resultado en una recomendación automática.

## 2. Punto de entrada

La comparación vive dentro del `OpportunityWorkspace`, después de disponer de contexto suficiente para construir el modelo C2 compatible.

No debe bloquear el valor C1 del Mortgage Twin ni exigir identidad, cuenta, contacto o documento subido al servidor.

## 3. Jerarquía de la superficie

1. Contexto de Loan Health y rutas.
2. Explicación del supuesto de comparación.
3. Campo único: `Abono único que quieres comparar (COP)`.
4. CTA: `Comparar reducir plazo vs. reducir cuota`.
5. Punto de partida compartido.
6. Dos tarjetas paralelas:
   - Opción A · R1 · reducir plazo.
   - Opción B · R2 · reducir cuota.
7. Disclosure: `La comparación no elige por ti.`

## 4. Resultado R1

Mostrar como mínimo:

- cuota financiera modelada;
- plazo resultante;
- reducción de plazo;
- interés nominal futuro evitado.

## 5. Resultado R2

Mostrar como mínimo:

- nueva cuota financiera modelada;
- reducción mensual modelada;
- reducción porcentual;
- plazo modelado;
- interés nominal futuro evitado.

## 6. Reglas de copy y confianza

Debe quedar visible que:

- el capital lo aporta el usuario;
- las dos alternativas usan exactamente el mismo abono;
- C2 es modelado, no verificado documentalmente;
- menor cuota, menor interés nominal futuro y menor plazo son objetivos distintos;
- el resultado no es una liquidación bancaria ni ahorro garantizado;
- la comparación no selecciona una opción por el usuario.

Evitar:

- `mejor opción` sin preferencias explícitas;
- `te conviene` como conclusión automática;
- `ahorrarás` como promesa;
- verde como sinónimo de garantía;
- ranking comercial de R1/R2.

## 7. Invalidación y feedback

Al modificar el abono único:

- se invalida inmediatamente el resultado R1/R2 anterior;
- desaparecen los badges C2 vinculados a esa comparación;
- el usuario debe ejecutar nuevamente el comparador.

Los modelos mensuales previos y el comparador de abono único deben diferenciarse para no mezclar provenance ni precisión.

## 8. Precedencia

Una alerta material, inconsistencia o situación procesal/profesional conserva precedencia visual y lógica sobre una optimización de prepago, incluso cuando R1/R2 tengan un modelo C2 válido.

## 9. Responsive y accesibilidad

- sin overflow horizontal a 390 px;
- labels asociados semánticamente;
- CTA operable por teclado;
- headings jerárquicos;
- resultados legibles sin depender solo de color;
- invalidación comprensible en texto;
- números financieros con formato local consistente.

## 10. Acceptance gate UX

- mismo abono visible para ambas alternativas;
- diferencia entre mantener cuota y mantener plazo comprensible;
- C1/C2 visibles sin false precision;
- disclosure de no-recomendación visible;
- precedencia profesional preservada;
- keyboard y mobile incluidos en E2E;
- ninguna modificación de copy o UI se introduce únicamente para satisfacer un locator obsoleto.
