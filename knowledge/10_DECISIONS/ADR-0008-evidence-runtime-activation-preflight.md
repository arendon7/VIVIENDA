# ADR-0008 — Evidence Runtime Activation Preflight

Status: **Accepted for V0.23.12**  
Date: 2026-09-07

## Contexto

V0.23.11 cerró la frontera de producto previa al intake documental: que el usuario declare sus soportes disponibles no significa que la plataforma esté habilitada para recibirlos.

El repositorio ya contiene piezas provider-ready relevantes:

- `CasePersistenceService` y `CasePersistencePort`;
- adaptador Supabase y RPCs endurecidos;
- coordinación de Storage con intents, quarantine/finalize y lifecycle;
- resolución de principal Supabase;
- HTTP boundary para prepare/complete/download;
- trusted-origin policy;
- Case State con autorización de datos y aceptación de servicio;
- runtime preview deliberadamente no configurado.

Sin embargo, tener código preparado no equivale a tener infraestructura live verificada.

La activación real introduce simultáneamente riesgos de:

- identidad incorrecta;
- acceso cruzado entre expedientes;
- persistencia parcial;
- Storage público o mal aislado;
- grants demasiado amplios;
- falta de eliminación física;
- bypass de rate limiting;
- ausencia de auditoría;
- tratamiento de datos sin autorización activa;
- confusión entre un Case local de preview y un expediente real;
- confusión entre aceptación de servicio y poder/mandato.

## Decisión

Todo runtime live de evidencia deberá construirse mediante un **Evidence Runtime Activation Preflight** fail-closed.

El preflight usa tres estados por requisito:

- `missing`;
- `configured_unverified`;
- `verified`.

Solo `verified` satisface un requisito.

La presencia de una variable de entorno, una URL, una key o un provider configurado **no** es evidencia suficiente por sí sola.

## Capas obligatorias

### 1. Environment

- proyecto dedicado a VIVIENDA;
- migraciones aplicadas;
- advisors de seguridad revisados.

### 2. Identity

- principal autenticado resuelto server-side;
- mapeo inmutable auth user → subjectRef verificado.

### 3. Persistence

- `CasePersistencePort` durable y probado.

### 4. Storage

- bucket privado;
- grants firmados de upload/download y finalize verificado;
- worker de eliminación física.

### 5. Boundary

- trusted origin;
- rate limiter productivo;
- transporte de auditoría estructurada.

### 6. Product

- Case real creado por el titular;
- autorización activa por finalidad compatible;
- aceptación explícita del alcance del servicio cuando la ruta asistida lo exige.

## Regla de activación

`runtimeMayActivate = true` únicamente cuando **todos** los requisitos están en `verified`.

Si uno solo permanece `missing` o `configured_unverified`:

- el runtime live no puede construirse por la ruta canónica;
- la configuración parcial se reporta como bloqueada;
- el preview debe conservar su comportamiento fail-closed.

## Construcción canónica

El archivo:

`server/evidence-api/activated-runtime.ts`

es la ruta canónica para un futuro wiring live.

`createActivatedEvidenceRuntime(...)` ejecuta primero:

`assertEvidenceRuntimeActivationAllowed(...)`

antes de construir `EvidenceHttpApi`.

V0.23.12 **no** reemplaza todavía:

`server/evidence-api/runtime.server.ts`

El runtime actual conserva deliberadamente:

- `UnconfiguredEvidenceApplication`;
- `FailClosedRateLimit`.

## Truth boundary

Un preflight exitoso significa únicamente:

> la infraestructura y los flujos previos exigidos fueron verificados y el runtime puede entrar a una activación controlada.

No significa:

- que un usuario ya esté autenticado;
- que exista un Case para ese usuario;
- que haya autorización activa en un expediente concreto;
- que un documento haya sido subido;
- que la evidencia esté verificada;
- que exista revisión profesional;
- que exista poder, mandato o representación;
- que una actuación haya sido radicada.

Esas condiciones siguen gobernadas por sus propios contratos y eventos.

## No secretos en el preflight

El resultado del preflight solo expone:

- código de requisito;
- capa;
- estado;
- criterio de verificación.

No debe transportar ni loggear:

- service-role keys;
- JWTs;
- signed URLs;
- upload tokens;
- bucket paths concretos;
- subjectRefs reales;
- passwords;
- documentos o contenido de evidencia.

## Consecuencias

### Positivas

- evita un runtime parcialmente activado;
- crea un checklist ejecutable y testeable;
- separa “provider configurado” de “provider verificado”;
- mantiene privacidad/seguridad por encima de velocidad de activación;
- crea una única puerta arquitectónica para el wiring live.

### Costos

- la activación exige verificación explícita de todas las capas;
- no se puede habilitar upload únicamente porque Storage o Supabase estén disponibles;
- provisioning, migraciones y validación de seguridad deben hacerse en un slice posterior controlado.

## Fuera de alcance de V0.23.12

- crear proyecto Supabase;
- activar Auth;
- aplicar migraciones live;
- crear bucket real;
- configurar secrets;
- desplegar rate limiter;
- desplegar worker de eliminación;
- habilitar upload en UI;
- cambiar `runtime.server.ts` al runtime activado;
- crear Cases reales;
- registrar consentimientos productivos;
- contratación/pago.
