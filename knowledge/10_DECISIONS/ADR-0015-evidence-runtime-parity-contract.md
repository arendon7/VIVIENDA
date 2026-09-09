# ADR-0015 · Evidence Runtime Parity Contract

## Estado

Aceptado para V0.23.19.

## Contexto

V0.23.17 demostró que la composición de Case State, autorización de datos, coordinación de Storage, clasificación server-side y frontera HTTP puede ejecutar correctamente un happy-path R7 asistido de forma determinística y sin infraestructura externa.

V0.23.18 añadió una matriz adversarial integrada que demuestra fail-closed frente a cinco condiciones críticas:

1. ausencia de autenticación;
2. ausencia de autorización de datos;
3. acceso a un Case ajeno;
4. objeto físico inexistente al completar;
5. indisponibilidad del rate limiter.

Ambos slices son baselines semánticos sólidos, pero hasta V0.23.18 estaban certificados por separado.

Antes de conectar un futuro runtime DEV a providers reales necesitamos responder otra pregunta:

> ¿cómo sabremos que el comportamiento observable de ese runtime conserva simultáneamente el happy-path y las fronteras fail-closed ya congeladas?

No basta con que un adapter compile o implemente una interfaz TypeScript. Tampoco basta con que migrations, RPCs o Storage existan. Un provider podría ser estructuralmente válido y aun así introducir drift semántico en status HTTP, errores públicos, orden de acceso a Storage, Case State, clasificación o auditoría.

## Decisión

Crear un **Evidence Runtime Parity Contract** provider-neutral, versionado y ejecutable.

La versión inicial es:

`V0.23.19-RUNTIME-PARITY-V1`

El contrato toma una observación normalizada y secret-free del comportamiento de un candidato y la compara contra:

- happy-path canónico de V0.23.17;
- failure matrix canónica de V0.23.18.

El contrato no configura providers y no crea un runtime live.

## Qué significa “paridad”

Paridad significa únicamente:

> el comportamiento observado coincide con las invariantes funcionales y de seguridad que V0.23.17 y V0.23.18 ya demostraron in-process.

No significa equivalencia de infraestructura, performance, disponibilidad, billing, backups ni operaciones del proveedor.

## Happy-path canónico

La observación conformante debe conservar:

- route `R7_RECLAMACION`;
- track `assisted`;
- Case final version `5`;
- stage `collecting_evidence`;
- secuencia exacta:
  1. `CASE_CREATED`
  2. `DATA_AUTHORIZATION_RECORDED`
  3. `SERVICE_AGREEMENT_ACCEPTED`
  4. `EVIDENCE_REQUESTED`
  5. `EVIDENCE_ATTACHED`
- ausencia de `EVIDENCE_VERIFIED`;
- una evidencia `statement`;
- clasificación efectiva `financial_credit_semiprivate`;
- security tier `restricted`;
- lifecycle `active`;
- HTTP prepare/complete/download = 200/200/200;
- auditoría en orden prepare → complete → download;
- clasificación del navegador subordinada a autoridad server-side;
- cero `storageLocator` y checksum en Case read model.

La inspección técnica de bytes/hash continúa sin equivaler a verificación profesional.

## Failure matrix canónica

La observación debe contener exactamente cinco escenarios:

### `unauthenticated_prepare`

- operación fallida: prepare;
- HTTP 401;
- `authentication_required`;
- Case version 4;
- cero evidencia;
- cero registry;
- cero Storage.

### `missing_data_authorization`

- operación fallida: prepare;
- HTTP 409;
- `data_authorization_required`;
- Case version 3;
- cero evidencia;
- cero registry;
- cero Storage.

### `cross_case_access`

- operación fallida: prepare;
- HTTP 403;
- `forbidden`;
- Case version 4;
- cero evidencia;
- cero registry;
- cero Storage.

### `missing_uploaded_object`

- prepare 200;
- complete 404;
- `evidence_not_found`;
- Case version 4;
- upload intent permanece `quarantine`;
- una reserva de registry;
- un upload grant;
- una inspección;
- cero evidencia persistida;
- cero `EVIDENCE_ATTACHED`.

### `rate_limit_unavailable`

- operación fallida: prepare;
- HTTP 503;
- `rate_limit_unavailable`;
- Case version 4;
- cero evidencia;
- cero registry;
- cero Storage.

## Fronteras comunes de failure

Todo escenario adversarial debe conservar:

- cero evidencia persistida;
- ausencia de `EVIDENCE_ATTACHED`;
- ninguna mutación adicional del Case por la operación rechazada;
- error público sanitizado;
- auditoría segura y determinística;
- el orden de contacto con registry/Storage fijado por la frontera de autorización.

## Observación provider-neutral

`EvidenceRuntimeParityObservation` contiene únicamente material seguro para comparación:

- versión del baseline;
- origen de la observación (`synthetic_baseline` o `dev_provider_candidate`);
- metadata de si hubo IO externo;
- happy-path normalizado;
- failure matrix normalizada.

No contiene:

- tokens de upload;
- signed URLs;
- `storageLocator`;
- object paths;
- checksums;
- bytes de documentos;
- PII;
- secrets del proveedor.

## IO externo y paridad

`externalIoOccurred` es metadata y **no es un requisito de igualdad**.

Por diseño:

- el baseline sintético tiene `externalIoOccurred = false`;
- un futuro candidato DEV puede legítimamente tener `externalIoOccurred = true`.

Ambos pueden ser semánticamente conformantes si el resultado observable coincide.

## Separación estricta de activación

El contrato de paridad no importa ni invoca:

- `runtime.server.ts`;
- `createActivatedEvidenceRuntime`;
- `assertEvidenceRuntimeActivationAllowed`;
- `verifiedEvidenceRuntimeActivationFacts`.

Una evaluación siempre retorna:

- `runtimeActivationAuthorized = false`;
- `activationDecisionEvaluated = false`.

Además, una observación que declare `liveRuntimeAuthorized = true` o `runtimeServerWasUsed = true` falla el contrato.

## Regla de autoridad

La relación correcta es:

`parity PASS` **no implica** `activation preflight PASS`

`activation preflight PASS` **no implica automáticamente** deployment productivo

`provider configurado` **no implica** `parity PASS`

Son gates diferentes y acumulativos.

## 37 checks iniciales

V0.23.19 fija 37 verificaciones:

- 3 globales;
- 8 de happy-path;
- 1 de completitud de failure matrix;
- 5 verificaciones por cada uno de los 5 escenarios adversariales.

Las categorías de failure por escenario son:

1. contrato público;
2. Case State;
3. persistencia/sanitización;
4. contacto con registry/Storage;
5. auditoría.

## Resultado

`evaluateEvidenceRuntimeParity` retorna:

- `conformant` si no existe ninguna desviación;
- `nonconformant` si una o más invariantes cambian.

`assertEvidenceRuntimeParity` permite convertir esa decisión en un gate de CI mediante `EvidenceRuntimeParityError`.

Las desviaciones se expresan mediante códigos estables y mensajes sanitizados; no incluyen payloads físicos del provider.

## Relación con adapters Supabase existentes

V0.23.19 no crea nuevamente adapters que ya existen.

La auditoría previa confirmó que el repo ya contiene:

- `SupabaseCasePersistenceAdapter`;
- `SupabasePrincipalResolver`;
- `SupabaseStorageCoordinationRegistry`;
- RPCs service-only para resolver objetos de intent y evidencia legible.

El nuevo contrato está por encima de esos componentes: determina qué comportamiento conjunto deberán demostrar cuando exista un entorno DEV provisionado y autorizado para pruebas.

## Consecuencias positivas

- evita que un futuro provider pase solo por compatibilidad de tipos;
- convierte V0.23.17 + V0.23.18 en un baseline único versionado;
- detecta drift de status/error público;
- detecta drift de Case State;
- detecta persistencia accidental tras rechazo;
- detecta acceso prematuro a Storage;
- detecta elevación indebida a `EVIDENCE_VERIFIED`;
- detecta pérdida de clasificación server-side;
- permite comparar synthetic vs DEV sin comparar secretos ni coordenadas físicas;
- mantiene la activación fuera del contrato.

## Costes y límites

- el baseline debe versionarse cuando cambie intencionalmente una semántica canónica;
- un cambio legítimo de producto puede requerir una nueva versión del parity contract;
- la paridad no mide latencia, disponibilidad, durability, backup ni compliance operativo del proveedor;
- el futuro harness DEV deberá producir la misma observación normalizada sin exponer datos sensibles.

## Regla de cambio

No se debe modificar silenciosamente `V0.23.19-RUNTIME-PARITY-V1` para acomodar un provider que falle.

Si el producto decide cambiar una semántica canónica:

1. se justifica el cambio;
2. se actualizan primero los contratos de dominio/HTTP correspondientes;
3. se actualizan los rehearsals;
4. se crea una nueva versión explícita del parity baseline;
5. se recertifica el stack.

## Zero semantic bridge

Un resultado `conformant` no crea ningún puente semántico hacia:

- provider disponible;
- Supabase DEV creado;
- migrations aplicadas;
- Auth verificado;
- RLS verificado;
- Storage real verificado;
- secrets configurados;
- rate limiting distribuido;
- auditoría externa operativa;
- runtime activado;
- usuario real autenticado;
- Case real creado;
- servicio contratado;
- poder otorgado;
- radicación ejecutada.

## Fuera de alcance V0.23.19

- crear o mutar proyectos Supabase;
- ejecutar billing/upgrade;
- aplicar migrations live;
- implementar un Storage gateway productivo;
- usar documentos reales;
- activar `runtime.server.ts`;
- construir activation facts verificados;
- habilitar rutas públicas nuevas;
- merge del stack.
