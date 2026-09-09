# ADR-0014 · Synthetic Evidence Failure Rehearsal

## Estado

Aceptado para V0.23.18.

## Contexto

V0.23.17 demostró que la composición real de Case, privacidad, coordinación de Storage y frontera HTTP puede ejecutar un happy path R7 asistido de manera determinística, in-process y sin infraestructura externa.

Ese rehearsal terminó correctamente en `EVIDENCE_ATTACHED`, conservando la separación entre inspección técnica del objeto y `EVIDENCE_VERIFIED`.

Sin embargo, antes de cualquier futura activación live faltaba una evidencia integrada distinta:

> que la misma composición real falle cerrada cuando identidad, consentimiento, ownership, objeto físico o rate limiting no permiten continuar.

Los componentes individuales ya tenían pruebas negativas, pero faltaba una matriz reproducible que comprobara el comportamiento conjunto y, especialmente, que una operación rechazada no persistiera evidencia ni avanzara el Case.

## Decisión

Crear un **Synthetic Evidence Failure Rehearsal** separado del happy path de V0.23.17.

La matriz V0.23.18 cubre exactamente cinco escenarios:

1. `unauthenticated_prepare`
2. `missing_data_authorization`
3. `cross_case_access`
4. `missing_uploaded_object`
5. `rate_limit_unavailable`

Todos usan:

- Case y persistencia reales en memoria;
- `CasePersistenceService` real;
- `EvidenceStorageCoordinator` real;
- `ServerClassifiedEvidenceApplication` real;
- `EvidenceHttpApi` real;
- adapters sintéticos determinísticos únicamente para infraestructura externa.

## Contrato común de rechazo

Para toda la matriz debe cumplirse:

- no se persiste evidencia;
- no aparece `EVIDENCE_ATTACHED`;
- el Case no incrementa versión por la operación rechazada;
- el error público permanece sanitizado;
- no ocurre IO externo;
- no se activa el runtime live;
- `runtime.server.ts` no participa.

Un escenario se considera exitoso cuando **falla exactamente como debe fallar**.

## Escenario 1 · Sin autenticación

`evidence.prepare` se ejecuta sin principal autenticado.

Resultado canónico:

- HTTP `401`;
- error `authentication_required`;
- cero reservas de registry;
- cero grants de Storage;
- cero inspecciones de Storage;
- cero evidencia persistida.

La autenticación debe fallar antes de tocar infraestructura física.

## Escenario 2 · Sin autorización de datos

Existe Case R7 asistido y servicio aceptado, pero no existe `DATA_AUTHORIZATION_RECORDED`.

Resultado canónico:

- HTTP `409`;
- error `data_authorization_required`;
- cero reservas de registry;
- cero grants de Storage;
- cero evidencia persistida.

Esto confirma que la evidencia documental no puede entrar a persistencia sin finalidad autorizada.

## Escenario 3 · Acceso cruzado

El Case pertenece a `sub_failure_owner`, pero la frontera HTTP resuelve otro cliente autenticado.

Resultado canónico:

- HTTP `403`;
- error `forbidden`;
- cero registry;
- cero Storage;
- cero evidencia persistida.

La autorización del Case debe ocurrir antes de reservar o inspeccionar objetos.

## Escenario 4 · Objeto ausente

El usuario autorizado prepara correctamente un upload intent y obtiene una reserva sintética, pero el objeto no existe cuando se intenta completar.

Resultado canónico:

- prepare HTTP `200`;
- complete HTTP `404`;
- error `evidence_not_found`;
- intent permanece `quarantine`;
- una reserva de registry;
- un grant de upload;
- una inspección de Storage;
- cero evidencia persistida;
- cero `EVIDENCE_ATTACHED`.

No se permite fabricar un receipt o metadata de evidencia cuando el objeto no fue encontrado.

## Escenario 5 · Rate limiter no disponible

La infraestructura protectora de rate limit responde `unavailable`.

Resultado canónico:

- HTTP `503`;
- error `rate_limit_unavailable`;
- la aplicación de evidencia no debe alcanzar Storage;
- cero registry;
- cero grants;
- cero evidencia persistida.

La indisponibilidad del control de abuso es fail-closed, no fail-open.

## Sanitización de errores

Los errores públicos de la matriz no deben revelar:

- `storageLocator`;
- checksums;
- tokens de upload;
- object paths internos;
- secretos;
- detalle del provider;
- PII.

La auditoría puede conservar `operation`, `status` y `errorCode`, pero no material físico privilegiado.

## Separación del runtime live

V0.23.18 no:

- importa `runtime.server.ts`;
- importa `createActivatedEvidenceRuntime`;
- crea `EvidenceRuntimeActivationFacts`;
- consume Supabase;
- consume red externa;
- usa credenciales;
- crea infraestructura;
- habilita rutas públicas nuevas.

Los resultados conservan:

- `mode = synthetic_failure_rehearsal`;
- `externalIoOccurred = false`;
- `liveRuntimeAuthorized = false`;
- `runtimeServerWasUsed = false`.

## Relación con V0.23.17

V0.23.17 responde:

> ¿Puede la composición completa realizar correctamente un happy path sintético?

V0.23.18 responde:

> ¿Puede la misma arquitectura rechazar correctamente condiciones inseguras o incompletas sin producir estado falso?

Ambos rehearsals son baseline semántico para un futuro adapter live; ninguno concede autorización de activación.

## Consecuencias

### Positivas

- se prueba fail-closed a nivel de composición, no solo por unidad;
- se demuestra que ownership y consentimiento bloquean antes de Storage;
- se prueba que un objeto inexistente no se convierte en evidencia persistida;
- se comprueba que rate limiting indisponible bloquea la operación;
- se mantiene una matriz determinística para comparar un futuro runtime DEV.

### Costes

- existe infraestructura sintética adicional de test;
- los adapters sintéticos deben permanecer deliberadamente aislados del runtime público;
- cada nueva failure scenario debe justificar una frontera real y no duplicar unit tests sin valor integrado.

## Regla de promoción

Un failure rehearsal verde significa únicamente:

> las condiciones adversas ensayadas fueron rechazadas correctamente por la composición in-process.

No significa:

- provider disponible;
- proyecto Supabase creado;
- DEV listo;
- Auth/RLS/Storage live verificados;
- secrets configurados;
- deployment seguro;
- runtime activable.
