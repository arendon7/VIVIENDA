# Casa con Criterio — Auditoría final de producto/UX · Brand V1

Fecha: 2026-09-03
Rama: `brand/casa-con-criterio-v1`
PR: #31
Base funcional: `product/prepayment-choice-comparison-v0.22`

## 1. Dictamen ejecutivo

La capa Brand V1 ya puede tratarse como una identidad de producto coherente y suficientemente estable para congelación visual/verbal, siempre que se mantenga separada de la afirmación de que el producto completo está listo para lanzamiento comercial general.

La auditoría confirma cinco fortalezas estructurales:

1. **La promesa de marca coincide con la lógica real del producto.** Casa con Criterio habla de entender, comparar y decidir; no promete aprobación, ahorro garantizado, verificación inexistente ni resultados jurídicos automáticos.
2. **Warm Path sigue siendo visible en la interacción.** La experiencia parte de una pregunta comprensible, entrega valor antes de pedir identidad y aumenta precisión por etapas.
3. **C0–C3 conserva su función de contrato de verdad.** La simplificación verbal no elimina niveles de precisión, fuente, vigencia ni límites.
4. **El lenguaje de cliente ya está claramente separado del lenguaje de ingeniería.** Los códigos técnicos permanecen en dominio, `data-*`, pruebas y trazabilidad sin dominar la interfaz.
5. **La marca ya funciona como sistema y no como decoración.** Logo, tipografía, color, navegación, instrumentos, formularios, resultados, evidencia y estados de decisión comparten una gramática reconocible.

## 2. Hallazgos por prioridad

### P0 — bloqueantes

**P0.1 · Enlace principal “Comparar” apuntaba a una ruta inexistente. — CORREGIDO**

La home contenía `/comparar-ofertas`, mientras la superficie implementada es `/comprar/comparar-cotizaciones`. Esto podía producir una ruptura directa de navegación desde el header.

Corrección aplicada:
- `Comparar` → `/comprar/comparar-cotizaciones`.
- Se añadió regresión E2E específica para impedir que `/comparar-ofertas` reaparezca.

No quedan P0 conocidos en la capa Brand V1 después de esta corrección.

### P1 — alta prioridad

**P1.1 · La navegación principal desaparecía en móvil. — CORREGIDO**

El sistema base ocultaba `nav` en pantallas compactas y la capa Brand V1 también ocultaba `.cc-main-nav` por debajo de 980 px. En 390 px el usuario podía quedar únicamente con el logo y sin acceso persistente a Radar Vivienda, Mi Vivienda, Comparar, Comprar o Resolver desde el header.

Corrección aplicada:
- navegación principal responsive en una segunda fila;
- scroll horizontal contenido cuando no cabe;
- navegación conservada incluso cuando el CTA del header se oculta en pantallas muy pequeñas;
- prueba E2E en viewport 390 × 844;
- control de overflow horizontal del documento.

**P1.2 · Coherencia de verdad y de riesgo. — APROBADO**

No se detectó una superficie principal que convierta:
- C1 en verificación documental;
- C2 en oferta o aprobación;
- abonos del usuario en “ahorro generado por Casa con Criterio”;
- una diferencia reportada en infracción demostrada;
- presión de pago en proceso judicial automático;
- una vista previa de servicio en contratación, poder o radicación.

## 3. Auditoría de las 11 superficies principales

| Superficie | Rol en el journey | Estado UX Brand V1 | Observación principal |
| --- | --- | --- | --- |
| `/` | Descubrimiento y orientación | Aprobada con ajustes | Wedge del crédito es claro; navegación rota y móvil ya corregidas. |
| `/revisar` | Primera lectura | Aprobada | Entrada breve, progresiva y sin identidad; lenguaje de Radar Vivienda consistente. |
| `/verificar` | Mejorar precisión | Aprobada | Explica correctamente que usar un archivo como referencia no equivale a C3. |
| `/mi-vivienda` | Home persistente conceptual | Aprobada como preview | Distingue demostración, C2 y ausencia de persistencia real. |
| `/ayuda` | Presión de pago / urgencia | Aprobada | Cambia prioridad desde optimización a urgencia sin inventar términos procesales. |
| `/revisar-diferencia` | Reconciliación | Aprobada | Separa diferencia observada de ilegalidad o derecho a devolución. |
| `/comprar/cuanto-puedo-comprar` | Capacidad sostenible | Aprobada | Mantiene separación entre sostenibilidad personal y monto que un banco podría prestar. |
| `/comprar/preparacion` | Home Readiness | Aprobada | El índice propio no se presenta como central de riesgo, score bancario o probabilidad de aprobación. |
| `/comprar/financiacion` | Exploración de estructuras | Aprobada | Evita ranking de entidades, tasas ficticias y equivalencia con cotización real. |
| `/comprar/comparar-cotizaciones` | Normalización de ofertas | Aprobada | Comparación explícita de cotizaciones declaradas y escenarios; no confunde con aprobación. |
| `/auditoria-hipotecaria` | Servicio asistido futuro | Aprobada como preview | Separa evidencia, revisión profesional, contratación y representación. |

## 4. Jerarquía comercial

La jerarquía general es correcta:

**Primario:** propietario/deudor con crédito existente → `Revisar mi crédito` → primera lectura → mayor precisión → Radar Vivienda → opciones → escenarios → ejecución cuando corresponda.

**Secundario:** comprador → capacidad sostenible → preparación → estructuras → comparación de cotizaciones.

**Urgencia:** dificultad de pago, cobranza o proceso → `Resolver` / `/ayuda` → prioridad de riesgo antes de optimización ordinaria.

**Evidencia:** inconsistencias → reconciliación preliminar → verificación → Auditoría Hipotecaria únicamente cuando exista un hecho concreto y el servicio sea activado de forma real.

Esta arquitectura evita un error frecuente de fintech: intentar convertir toda visita en una oferta de crédito.

## 5. Coherencia de marca

### Identidad

El logo implementado respeta la dirección aprobada:
- casa de trazo ocre;
- doble C dentro de la casa;
- `CASA` y `CRITERIO` dominantes;
- `con` pequeño y situado a la derecha de `CASA`, no debajo;
- versión horizontal y símbolo independiente.

### Paleta

La combinación azul profundo + ocre patrimonial + verde suave + marfil funciona bien para el territorio buscado: financiero, editorial, cálido y no bancario-genérico.

### Tipografía

- Lora: narrativa, titulares y autoridad editorial.
- Work Sans: interfaz, datos, formularios y lectura operativa.

La división es coherente con la idea de “criterio”: interpretación humana arriba, precisión funcional abajo.

## 6. P2 — mejoras recomendadas después de congelar Brand V1

Estas mejoras no deberían bloquear la congelación de la identidad:

1. **Unificar la narrativa de ejemplos de la home.** Actualmente conviven varios conjuntos de cifras ilustrativas. Todos están etiquetados como ejemplos, pero una historia numérica única reduciría carga cognitiva y reforzaría la sensación de continuidad.
2. **Refinar la taxonomía del nav principal.** `Comparar` hoy conduce específicamente a cotizaciones del journey comprador. Más adelante conviene decidir si el concepto maestro será “Comparar”, “Optimizar” o una entrada contextual según tipo de usuario.
3. **Convertir Mi Vivienda de preview a objeto persistente real.** La interfaz es válida, pero la promesa completa de “Mi Vivienda” necesita cuenta, consentimiento, persistencia y actualización de estado antes de comercializarla como espacio personal permanente.
4. **Activar C3 real únicamente cuando exista pipeline documental auténtico.** La interfaz ya protege este límite; la próxima evolución debe preservar exactamente esa disciplina.
5. **Definir el handoff comercial de Auditoría Hipotecaria.** Hoy la vista describe correctamente un servicio futuro. Falta contratación real, alcance, pago, tratamiento de datos, expediente y revisión profesional operativa.
6. **Instrumentar analítica del funnel.** Medir inicio → primera lectura → aumento de precisión → opción comparada → acción preparada → conversión asistida, sin convertir la experiencia en un formulario de captura prematura.

## 7. P3 — refinamientos posteriores

- microanimaciones discretas en Radar Vivienda y rutas de escenario;
- iconografía funcional adicional solo donde mejore scanning;
- sistema editorial para educación y SEO;
- variantes de campaña que usen datos y reglas verificables;
- normalización final de nomenclatura entre “revisión”, “análisis”, “simulación” y “comparación” conforme se consolide el funnel real.

## 8. Accesibilidad y mobile

La base auditada mantiene:
- skip link;
- headings semánticos;
- `fieldset` y labels en formularios;
- estados de foco visibles;
- controles de 44–50 px;
- navegación por teclado cubierta en E2E;
- layout sin overflow horizontal en 390 px en journeys críticos;
- navegación principal recuperada en móvil después del hardening de esta auditoría.

## 9. Recomendación de congelación

### Brand V1

**Sí: candidata a congelación.**

La recomendación es declarar como canónicos para la siguiente etapa:
- nombre **Casa con Criterio**;
- símbolo casa + doble C;
- wordmark actual;
- paleta Brand V1;
- Lora + Work Sans;
- lenguaje `Radar Vivienda`, `Mi Vivienda`, `Mi Situación`, `Mis Escenarios`, `Plan de acción`;
- filosofía `Primero entiende. Después decide.`;
- línea comercial `Conoce las reglas. Haz las cuentas. Decide con criterio.`;
- contratos C0–C3 y consumer-language firewall.

### Producto completo

**Todavía no debe confundirse “Brand V1 congelada” con “producto listo para lanzamiento general”.**

La siguiente etapa ya no es rediseñar la marca. Es convertir las superficies conceptuales en operación real: persistencia, evidencia C3 auténtica, casos, consentimientos, ejecución asistida, medición del funnel y capacidades comerciales verificables.

## 10. Criterio de salida de esta fase

La fase Brand V1 puede cerrarse cuando el HEAD que contiene las correcciones de navegación y mobile complete en verde:

- Typecheck;
- tests de dominio;
- build;
- E2E completo, incluido el nuevo control de navegación de home en 390 px.

No se requiere merge ni deploy para cerrar esta auditoría.
