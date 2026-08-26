# VIVIENDA — Auditoría Hipotecaria asistida v0.12

Date: 2026-08-26
Status: product/execution contract
Base: Loan Health v0.11

## 1. Objetivo

Probar la primera ruta asistida completa reutilizando la arquitectura ya existente, sin abrir un workflow universal nuevo.

La ruta elegida es:

**Auditoría Hipotecaria documental sobre una inconsistencia concreta detectada por R7_RECLAMACION.**

El servicio ayuda a aislar una diferencia, organizar evidencia, verificar documentos y obtener una revisión profesional que determine el siguiente paso legítimo.

## 2. Por qué esta ruta

Reutiliza sin ampliar artificialmente la arquitectura:

- Mortgage Twin / precision C1–C3;
- Loan Health `consistency = attention`;
- Opportunity Router R7;
- Case Plan de auditoría/reclamación;
- Case State Machine;
- data authorization;
- evidence/storage boundary;
- professional review;
- eventual preparación de una solicitud o reclamación solo si los hechos lo soportan.

## 3. Qué NO es

La Auditoría Hipotecaria v0.12 no es:

- una demanda automática;
- una promesa de reducción de deuda;
- un dictamen de ilegalidad generado por IA;
- una representación judicial;
- un poder extrajudicial implícito;
- una reclamación ya radicada;
- una garantía de ahorro o resultado.

Aceptar el servicio no concede poder judicial ni facultad extrajudicial.

## 4. Entrada

La ruta v0.12 se activa únicamente cuando existe una oportunidad R7 originada en un hecho concreto, por ejemplo:

- cobro no explicado;
- diferencia entre extracto y condición contractual;
- aplicación de un abono que no coincide con la instrucción reportada;
- discrepancia documental material.

Una sospecha genérica sin hecho/documento concreto no se convierte automáticamente en caso R7.

## 5. Track

Case track inicial:

`assisted`

La revisión profesional puede ser realizada por actor `lawyer` según el Case State actual, sin que eso conceda representación o poder.

Si posteriormente se requiere actuación jurídica como representante, debe existir un engagement/authority adicional y verificable.

## 6. Secuencia mínima de ejecución

1. `CASE_CREATED` — track assisted, origen R7.
2. `DATA_AUTHORIZATION_RECORDED`.
3. `SERVICE_AGREEMENT_ACCEPTED`.
4. `EVIDENCE_REQUESTED`.
5. `EVIDENCE_ATTACHED`.
6. `EVIDENCE_VERIFIED`.
7. `PROFESSIONAL_REVIEW_REQUESTED`.
8. `PROFESSIONAL_REVIEW_COMPLETED`.

La entrega profesional puede completarse en el paso 8 aunque el Case permanezca abierto para una decisión posterior.

No se registra `SUBMISSION_RECORDED` sin una radicación real y evidencia/referencia externa.

## 7. Evidencia mínima

El checklist debe heredar el Case Plan R7 y normalmente incluir:

- extracto/movimiento donde aparece la diferencia;
- instrucción dada al banco, si existió;
- contrato o condición relevante cuando aplique;
- comunicaciones/radicados/respuestas anteriores cuando existan.

No pedir cédula, poder o expediente judicial si no son necesarios para esta fase.

## 8. Entregable

El entregable profesional debe separar:

### A. Hechos observados

Qué muestran los documentos y qué reportó el usuario.

### B. Evidencia disponible

Qué está verificado, qué falta y qué entra en conflicto.

### C. Explicación / conciliación

Cuando la diferencia tenga una explicación razonable soportada por la evidencia.

### D. Posible inconsistencia

Cuando exista una diferencia concreta que justifique solicitud de información, corrección o revisión jurídica posterior.

### E. Siguiente ruta

Una de:

- no actuar / conservar explicación;
- solicitar información o aclaración;
- solicitar corrección;
- preparar reclamación;
- escalar a revisión jurídica adicional;
- re-rutear a R10 si aparece proceso ejecutivo/embargo/remate verificado.

## 9. Clasificación de hallazgos

Estados permitidos:

- `explained` — la evidencia disponible permite explicar la diferencia;
- `needs_more_evidence` — no existe base suficiente para concluir;
- `possible_inconsistency` — hay una diferencia concreta que merece actuación/revisión;
- `route_change_required` — los hechos nuevos requieren reejecutar el router antes de seguir.

No existe estado `illegal` automático.

## 10. Conversion boundary

La UI puede ofrecer:

**Preparar mi auditoría**

solo después de explicar:

- qué revisamos;
- qué documentos hacen falta;
- qué recibe el usuario;
- qué no incluye;
- que no crea representación o poder.

Mientras no existan auth/pago live, la superficie permanece preview y no afirma que el servicio haya sido contratado.

## 11. Legal/commercial boundary

La contratación profesional debe ser directa con el usuario.

El origen de marketing/referral se almacena separado del engagement jurídico y no concede participación automática en honorarios o poderes.

## 12. Acceptance criteria

1. solo R7 puede construir el blueprint v0.12;
2. el blueprint usa track `assisted`;
3. requiere autorización de datos antes de persistir evidencia;
4. requiere service agreement explícito;
5. requiere evidencia verificada antes de marcar el paquete listo para review;
6. professional review completed exige actor lawyer según Case State existente;
7. service agreement no concede extrajudicial authority;
8. service agreement no concede judicial power;
9. no existe submission/radicación ficticia;
10. el resultado no contiene garantía de ahorro, ilegalidad o éxito;
11. una actuación posterior como representante exige authority separada;
12. un proceso ejecutivo nuevo obliga a re-rutear antes de seguir con R7 ordinario.

## 13. Fuera de alcance

- pagos productivos;
- firma electrónica productiva;
- poder/mandato automático;
- radicación automática;
- generación autónoma de demanda;
- litigio;
- negociación productiva;
- SLA/precio final;
- OCR productivo.
