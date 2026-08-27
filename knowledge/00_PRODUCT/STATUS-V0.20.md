# STATUS V0.20 — Statement-Guided Mortgage Twin

## Estado

**FROZEN / FULL GREEN**

Rama:

`product/statement-guided-mortgage-twin-v0.20`

Base funcional heredada:

**v0.19 — Scenario-Based Economic Quote Comparison**

Head funcional verde v0.20:

`81d34b496f285a59dd5ba4dad833082642bf82d3`

## Gate

Sobre `81d34b496f285a59dd5ba4dad833082642bf82d3`:

- TypeScript: PASS.
- dominio total: **380/380 PASS**.
- invariantes nuevos de Statement-Guided Intake: **24 PASS**.
- production build: PASS.
- Playwright: **166/166 PASS**.
- viewport E2E: desktop + mobile 390 px.

Durante la migración se detectaron fallos de E2E causados por expectativas heredadas de la antigua demo documental y, posteriormente, por selectores/textos demasiado globales. No se suavizó el contrato de producto: los tests fueron migrados al nuevo journey y el boundary C1 se hizo más explícito en UI. El head funcional final quedó full green antes de este freeze documental.

## Pregunta de producto

v0.20 responde:

> **¿Puede una persona usar un extracto reciente como referencia local para construir una fotografía materialmente mejor de su crédito sin que VIVIENDA finja haber subido, leído, extraído o verificado ese documento?**

La respuesta implementada es sí, mediante transcripción guiada con provenance C1 explícita.

## Evolución del journey

La ruta anterior:

`Quick Check C1 → escenario manual C2 → demo documental simulada`

se reemplaza por:

`Quick Check C1 → extracto local como referencia → Mortgage Twin C1 → modelo C2 compatible → Opportunity Router / Case Plan`

C3 queda reservado para una futura ruta de evidencia realmente derivada del documento y reconciliada.

## `/verificar`

`/verificar` deja de ser una demo de extracción simulada.

Ahora guía al usuario para:

1. seleccionar localmente un extracto PDF/JPG/PNG como referencia;
2. mirar ese extracto en su propio dispositivo;
3. transcribir únicamente los campos que pueda identificar con seguridad;
4. construir un Mortgage Twin C1 cuando existen los campos materiales mínimos;
5. habilitar un modelo C2 solo cuando el producto/modalidad/sistema y datos requeridos son compatibles;
6. continuar hacia Opportunity Router sin perder producto/modalidad ya conocidos.

El archivo local no se envía a VIVIENDA en v0.20.

## Truth boundary del archivo local

Seleccionar un archivo no cambia la procedencia de los datos.

Un dato digitado por el usuario mirando su extracto conserva:

- `sourceType = user_declared`;
- `acquisitionMethod = user_transcribed_from_local_statement`;
- `documentReadByPlatform = false`;
- `userConfirmed = true`.

Por tanto:

- snapshot guiado = **C1**;
- cálculo determinista compatible = **C2**;
- documento local ≠ evidencia procesada;
- documento local ≠ OCR;
- documento local ≠ extracción;
- documento local ≠ revisión profesional;
- documento local ≠ C3.

La UI declara de manera atómica:

> **Datos transcritos por ti desde un extracto local. VIVIENDA no leyó ni verificó el archivo.**

Y separadamente:

> **C3 requiere evidencia realmente derivada del documento y reconciliación completa.**

## Contrato de precisión

- **C0** — orientación.
- **C1** — estimación / información declarada por el usuario.
- **C2** — cálculo o simulación modelada con supuestos suficientes.
- **C3** — verificado documentalmente con evidencia realmente derivada y reconciliada.

v0.20 no permite que selección local, confirmación manual o modelación eleven C1 a C3.

## Campos materiales del snapshot

Para `snapshot_ready` se requieren:

1. tipo de producto;
2. fecha de corte;
3. modalidad pesos / UVR;
4. saldo de capital válido.

El snapshot puede permanecer incompleto cuando falta alguno.

Campos adicionales del primer modelo C2 compatible:

5. tasa efectiva anual explícita;
6. cuotas restantes;
7. sistema de amortización.

Campos de contexto, sin autoridad para alterar precisión:

- entidad;
- pago/cuota/canon total reciente;
- seguros/costos mensuales identificables.

Un contexto numérico inválido se omite y se reporta como issue de contexto; no bloquea por sí mismo un snapshot materialmente válido.

## Readiness

### Referencia local

- `no_local_statement`;
- `local_statement_selected`;
- `local_statement_rejected`.

### Snapshot

- `incomplete`;
- `snapshot_ready`.

### Modelo de decisión

- `not_applicable`;
- `needs_data`;
- `ready_for_constant_payment_pesos_model`.

La separación impide convertir “tengo una fotografía suficiente del crédito” en “este producto ya puede usar cualquier simulador”.

## Pesos, UVR y leasing

El primer handoff C2 soportado exige:

- crédito hipotecario de vivienda;
- modalidad pesos;
- saldo válido;
- tasa EA explícita válida;
- cuotas restantes positivas;
- sistema `constant_payment_pesos`.

Reglas congeladas:

- **UVR no hereda automáticamente la fórmula de pesos**;
- **leasing habitacional no hereda automáticamente el modelo de prepago hipotecario**;
- un sistema de amortización no soportado bloquea el modelo, no el snapshot C1;
- una tasa ambigua no se convierte silenciosamente a EA.

## Mortgage Twin

Mortgage Twin soporta ahora explícitamente tres modos semánticos:

- `declared` → C1;
- `preview` → C2;
- `verified` → C3.

El modo `declared` muestra provenance local transcrita y evita cualquier claim de verificación documental.

El filename puede aparecer únicamente como UI efímera; no entra al snapshot canónico, URL ni provenance.

## Opportunity Router / Case Plan

Al sustituir la demo documental se detectó una regresión de arquitectura: la antigua UI también actuaba como puerta visible hacia Opportunity Router / Case Plan.

v0.20 corrige esa pérdida sin restaurar la demo.

Después del Mortgage Twin C1 aparece el CTA:

**“Explorar mis próximas decisiones”**

El Router recibe el contexto ya conocido del snapshot —incluidos tipo de producto y modalidad— para evitar repetir preguntas y degradar información a `unknown`.

El Router continúa operando sobre C1 cuando la fuente es transcripción del usuario. El hecho de que exista un motor C2 compatible separado no convierte el Case Log en C2.

## Privacidad

v0.20 no:

- sube bytes del archivo;
- llama Evidence API para simular éxito;
- crea IDs falsos de evidencia;
- persiste nombre de archivo;
- serializa datos financieros en URL;
- envía filename, saldo, tasa, pago o bytes a analytics genéricos.

Tipos locales aceptados como referencia de conveniencia:

- PDF;
- JPG/JPEG;
- PNG;
- máximo 15 MiB en el chequeo cliente.

Estos checks cliente no se presentan como validación de contenido del servidor.

## Provider/runtime boundary

El stack existente de Evidence API / storage permanece separado, fail-closed y provider-ready.

v0.20 no activa:

- Supabase;
- buckets productivos;
- identidad/sesiones productivas;
- OCR;
- upload servidor;
- reconciliación documental real;
- proveedor externo.

La arquitectura de C3 no se elimina; simplemente deja de estar representada por una demo que podía confundirse con funcionamiento real.

## UX

La secuencia pública principal de `/verificar` queda:

**explicación de privacidad → selección local de referencia → transcripción guiada → validación determinista → snapshot C1 → Mortgage Twin → modelo C2 cuando aplica → próximas decisiones**.

Principios:

- no prellenar valores como si hubieran sido extraídos;
- no solicitar identidad para obtener el valor inicial;
- preguntar solo información necesaria para cada nivel;
- distinguir campos materiales, de modelo y de contexto;
- explicar por qué un modelo está bloqueado en vez de inventar compatibilidad;
- conservar `C1 · Estimación` visible donde corresponde;
- mantener el boundary C3 visible;
- responsive en 390 px.

La capa visual específica de `/verificar` incluye jerarquía propia, secciones guiadas, grids, resultados, estados, CTA downstream y comportamiento responsive.

## E2E v0.20

La matriz total sube de 148 a **166 pruebas** y cubre desktop + mobile 390 px.

Los escenarios nuevos cubren, entre otros:

1. apertura del intake sin valores financieros extraídos/simulados;
2. archivo local válido y filename efímero;
3. rechazo de tipo de archivo no soportado;
4. provenance C1 y ausencia de C3;
5. construcción de snapshot mínimo;
6. contexto opcional inválido sin bloqueo material indebido;
7. modelo C2 únicamente para crédito hipotecario en pesos compatible;
8. UVR bloqueando el modelo de pesos;
9. leasing sin heredar automáticamente el modelo hipotecario;
10. handoff hacia Opportunity Router conservando contexto;
11. navegación por teclado/foco;
12. ausencia de overflow horizontal en móvil.

## Regresiones evitadas durante implementación

El proceso detectó y corrigió dos riesgos que no debían quedar ocultos:

1. retirar la demo había retirado también la entrada visible a Router / Case Plan;
2. tests heredados confundían la antigua UI de simulación con el contrato funcional que realmente debía preservarse.

La solución fue preservar capacidad, no preservar la demo.

## Fronteras congeladas

v0.20 no hace:

- server upload;
- persistencia productiva;
- OCR o extracción;
- documento → C3;
- autenticación productiva;
- provider activation;
- conectividad bancaria;
- Open Finance;
- consulta de centrales;
- matching de compra de cartera;
- recomendación de banco/producto;
- elegibilidad, preaprobación o aprobación;
- probabilidad de aprobación;
- ahorro garantizado;
- conclusión legal automática.

## Decisión de producto congelada

> **Un documento local puede guiar al usuario sin convertirse en evidencia que VIVIENDA afirme haber leído.**

Esa separación permite entregar valor real al existing borrower hoy sin debilitar la arquitectura futura de evidencia, identidad, seguridad y C3.