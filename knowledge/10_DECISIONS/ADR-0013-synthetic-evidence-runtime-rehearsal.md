# ADR-0013 · Synthetic Evidence Runtime Rehearsal

## Estado

Aceptado para V0.23.17.

## Contexto

V0.23.12 definió que un runtime real de evidencia solo puede activarse después de un preflight 15/15 verificado.

V0.23.13–V0.23.16 añadieron los gates de provisión, calificación DEV, capacidad del proveedor y recuperación de capacidad.

El primer intento controlado de crear `vivienda-dev` no produjo infraestructura porque la organización Supabase accesible no tenía capacidad Free disponible. No existe autorización vigente para pausar infraestructura de otro producto ni para ejecutar un upgrade de plan.

Sin embargo, el repositorio ya contiene piezas reales y maduras del futuro runtime:

- `CasePersistenceService`;
- `MemoryCasePersistence`;
- `EvidenceStorageCoordinator`;
- `ServerClassifiedEvidenceApplication`;
- `EvidenceHttpApi`;
- Case State y contratos de privacidad/evidencia.

Los tests previos verificaban esas piezas principalmente por separado. Faltaba una prueba de integración reproducible que demostrara que la cadena completa puede operar coherentemente sin depender de infraestructura externa.

## Decisión

Crear un **Synthetic Evidence Runtime Rehearsal** explícito, in-process y exclusivamente sintético.

El rehearsal:

1. usa la implementación real de `CasePersistenceService`;
2. persiste sobre `MemoryCasePersistence`;
3. usa la ruta R7 asistida canónica;
4. registra `CASE_CREATED`;
5. registra `DATA_AUTHORIZATION_RECORDED`;
6. registra `SERVICE_AGREEMENT_ACCEPTED`;
7. registra `EVIDENCE_REQUESTED`;
8. ejecuta `evidence.prepare` por `EvidenceHttpApi`;
9. usa `ServerClassifiedEvidenceApplication` para recuperar autoridad server-side sobre clasificación;
10. simula únicamente la presencia física del objeto mediante Storage en memoria;
11. ejecuta `evidence.complete` por HTTP y produce `EVIDENCE_ATTACHED` mediante el dominio real;
12. ejecuta `evidence.download` por HTTP;
13. lee el Case final desde el servicio real.

## Separación respecto del runtime live

El rehearsal **no**:

- importa `runtime.server.ts`;
- modifica `runtime.server.ts`;
- importa `createActivatedEvidenceRuntime`;
- produce `EvidenceRuntimeActivationFacts`;
- afirma que existe un provider real;
- consume Supabase;
- consume red externa;
- usa secretos;
- habilita rutas públicas adicionales.

`runtime.server.ts` conserva:

- `UnconfiguredEvidenceApplication`;
- `FailClosedRateLimit`;
- comportamiento fail-closed.

## Separación semántica crítica

La inspección técnica del objeto —MIME, tamaño y SHA-256— **no equivale** a `EVIDENCE_VERIFIED`.

El rehearsal termina en:

`EVIDENCE_ATTACHED`

Por ello, la proyección final permanece:

`stage = collecting_evidence`

No puede avanzar a `ready_for_review` sin una verificación de evidencia posterior atribuida a abogado/admin conforme al Case State.

Esto evita convertir una comprobación técnica de bytes en una conclusión profesional sobre el significado o suficiencia de la evidencia.

## Autoridad de clasificación

El rehearsal envía deliberadamente desde la frontera HTTP una clasificación débil para un `statement`:

- `legalDataCategory = non_personal`
- `securityTier = open`

`ServerClassifiedEvidenceApplication` debe sustituirla por la clasificación canónica:

- `financial_credit_semiprivate`
- `restricted`

La evidencia finalmente persistida debe reflejar únicamente la clasificación server-side.

## Datos sintéticos

Todos los identificadores, timestamps, checksums, tokens y objetos son determinísticos y sintéticos.

El rehearsal no acepta ni necesita:

- nombres reales;
- emails;
- cédulas;
- teléfonos;
- extractos reales;
- documentos reales;
- datos bancarios reales.

## Frontera de Storage

Storage y registry son adapters sintéticos en memoria, pero respetan los contratos reales:

- bucket canónico `vivienda-evidence`;
- paths opacos bajo `quarantine/<intent>/<evidence>/<object>`;
- grants temporales;
- inspección técnica antes de finalización;
- descarga solo después de finalización.

El Case read model/report no expone:

- `storageLocator`;
- checksum SHA-256;
- upload token.

## Consecuencias positivas

- permite probar la composición real del runtime sin infraestructura paga;
- detecta drift entre Case State, privacidad, Storage y HTTP;
- demuestra que la clasificación server-side domina al navegador;
- permite validar la futura arquitectura antes de V0.23.12 live activation;
- mantiene el runtime público fail-closed.

## Límites

Un rehearsal verde no prueba:

- Supabase Auth;
- RLS real;
- Storage real;
- migrations aplicadas externamente;
- secretos server-side en un deployment real;
- rate limiting distribuido;
- trusted origins reales;
- recovery/backup;
- observabilidad externa;
- performance;
- disponibilidad;
- billing;
- producción.

Por tanto, un rehearsal verde produce **cero facts de activación live**.

## Regla de promoción

V0.23.17 nunca puede sustituir:

- V0.23.12 Activation Preflight;
- V0.23.13 Provisioning Blueprint;
- V0.23.14 DEV Qualification;
- V0.23.15 Provider Capacity Preflight.

Cuando exista un proyecto DEV real, el rehearsal sirve como baseline semántico para comparar el adapter real contra el comportamiento esperado, no como autorización de activación.
