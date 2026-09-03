# VIVIENDA — Product Integration Contract v0.10

Date: 2026-08-26
Status: implementation contract

## 1. Objetivo

Convertir la foundation v0.9 en una superficie de producto coherente para el usuario recurrente sin fingir capacidades de autenticación, persistencia, scoring o integración que todavía no están activas.

El slice materializa la jerarquía autenticada definida en la IA:

**Inicio / Mi Vivienda → Mi crédito (Mortgage Twin) → Oportunidades → Simulaciones → Documentos → Casos cuando existan.**

## 2. User job

Usuario con crédito existente:

> “Quiero ver en un solo lugar qué sé de mi crédito, qué tan precisa es esa información y cuál es la siguiente decisión que vale la pena tomar.”

## 3. Primera superficie

Ruta inicial:

`/mi-vivienda`

Mientras no exista auth/persistencia productiva, esta ruta es un **preview explícito del producto** y no un dashboard que pretenda contener datos guardados del usuario.

## 4. Momento de valor

En la primera pantalla el usuario debe poder entender:

1. cuál es el estado conocido del crédito;
2. qué nivel de precisión tiene;
3. qué falta verificar;
4. cuáles son las próximas acciones legítimas;
5. cuáles acciones son DIY y cuáles requieren asistencia/revisión.

## 5. Jerarquía

### A. Current decision state

Primero mostrar una síntesis accionable, no KPIs genéricos.

### B. Mortgage Twin

Mostrar saldo, cuota, modalidad, plazo/tasa cuando existan, cada uno con provenance/precision cuando sea material.

### C. Next best actions

Oportunidades priorizadas por consecuencia y utilidad, nunca por monetización.

### D. Precision path

Explicar el salto:

`C1 declarado → C2 modelado → C3 verificado documentalmente`.

### E. Supporting objects

- simulaciones;
- documentos;
- casos/ejecución solo cuando una acción haya sido elegida.

## 6. Guardrails

- No score numérico de Loan Health hasta tener contrato validado.
- No tasa de mercado actual sin fuente/fecha.
- No “ahorro potencial” inventado.
- No “compatible con banco X” sin adapter/reglas verificadas.
- No “guardado”, “sincronizado” o “actualizado automáticamente” mientras no exista persistencia real.
- No C3 por confirmación manual o evidencia simulada.
- No caso real por generar un Case Plan.
- No contratación legal implícita por seleccionar una ruta.

## 7. Estados cualitativos permitidos

Mientras no exista score validado, usar estados respaldados por el contexto disponible:

- `Listo para simular`;
- `Falta información`;
- `Requiere verificación documental`;
- `Oportunidad para explorar`;
- `Revisión profesional recomendada`.

Evitar `bueno/malo`, probabilidades y grados ficticios.

## 8. Sensitive-data boundary

v0.10 no amplía captura de información sensible.

El dashboard preview puede reutilizar valores de demostración ya marcados como tales. La transición a datos reales deberá pasar por:

- sesión autenticada;
- purpose-specific consent;
- persistence boundary;
- evidence/storage contract;
- provenance.

## 9. Conversion point

El principal CTA no es “hablar con ventas”.

Según estado:

- `Revisar mi crédito`;
- `Continuar con más precisión`;
- `Verificar con un extracto`;
- `Preparar esta ruta`.

La elección DIY/assisted permanece visible cuando ambas sean válidas.

## 10. Acceptance criteria

1. `/mi-vivienda` existe y es navegable por teclado.
2. La ruta declara visiblemente que es preview sin cuenta/persistencia activa.
3. Mortgage Twin no se presenta como C3.
4. No existe score numérico.
5. No existe aprobación bancaria, matching o tasa externa fabricada.
6. El usuario identifica al menos una siguiente acción legítima.
7. Hay salida a `/revisar` y `/verificar` cuando corresponde.
8. Mobile 390 px no presenta overflow horizontal.
9. No se añade una taxonomía nueva de journeys incompatible con `JOURNEY-MAP.md`.
10. v0.10 no requiere Supabase live para compilar o probar.

## 11. Fuera de alcance

- autenticación productiva;
- dashboard persistente real;
- OCR;
- bank adapters;
- marketplace;
- Home Readiness;
- buyer affordability;
- notificaciones;
- pagos;
- automatización legal adicional.
