# STATUS V0.19 — Scenario-Based Economic Quote Comparison

## Estado

**FROZEN / FULL GREEN**

Rama:

`product/economic-quote-comparison-v0.19`

Base funcional heredada:

**v0.18 — Quote Normalization / Base Comparable de Cotizaciones**

Head funcional verde v0.19:

`810a87492e271ce2be2c07463467a15797aba7e5`

## Gate

Sobre `810a87492e271ce2be2c07463467a15797aba7e5`:

- TypeScript: PASS.
- dominio total: **356/356 PASS**.
- invariantes nuevos de Economic Quote Comparison: **35 PASS**.
- production build: PASS.
- Playwright: **148/148 PASS**.
- viewport E2E: desktop + mobile 390 px.

La primera corrida E2E del slice quedó en 146/148 porque `getByRole("alert")` también encontraba el route announcer interno de Next.js. El mensaje de validación de UVR estaba presente y correcto. El test se corrigió para apuntar al mensaje exacto; no se modificó producto, copy ni dominio.

## Pregunta de producto

v0.19 responde una pregunta más estrecha que “¿cuál es el mejor crédito?”:

> **Bajo estos datos declarados y estos supuestos explícitos, ¿cómo se ven los flujos económicos de dos cotizaciones y qué métricas pueden compararse responsablemente?**

## Relación con v0.18

v0.18 sigue siendo la puerta de entrada C1:

1. capturar una cotización declarada;
2. normalizar su estructura;
3. detectar faltantes materiales;
4. añadir una segunda cotización;
5. revelar diferencias de base;
6. habilitar v0.19 únicamente cuando el par está en `ready_for_future_economic_model`.

v0.19 no crea un formulario paralelo ni una ruta separada. Reutiliza en memoria las dos entradas ya normalizadas en `/comprar/comparar-cotizaciones`.

No serializa datos financieros en query params ni finge persistencia.

## Precisión

- Cotizaciones ingresadas por el usuario: **C1 — declaradas, no verificadas**.
- Flujos derivados del motor: **C2 — modelados con supuestos explícitos**.

C2 no convierte C1 en C3. La modelación no verifica la cotización ni sus documentos.

## Modelo económico

El motor construye un flujo gobernado por cotización y, por separado, aplica gates de comparabilidad del par.

La separación es intencional:

- una cotización puede ser modelable;
- dos cotizaciones pueden ser modelables;
- aun así el par puede no ser responsablemente rankeable bajo una métrica concreta.

### Componentes del flujo

Según la estructura declarada y el escenario, el modelo puede incorporar:

- efectivo total requerido al cierre;
- cuotas o cánones recurrentes;
- seguros que la cotización declara por fuera del pago inicial;
- opción de compra del leasing cuando el usuario decide incluirla;
- trayectoria UVR de sensibilidad suministrada explícitamente;
- valor presente cuando el usuario define una tasa anual de comparación.

Los costos de una sola vez no se vuelven a sumar cuando ya están comprendidos dentro del efectivo total al cierre declarado.

## Pesos

Para una cotización en pesos con comportamiento de cuota nominal constante, v0.19 usa la cuota/canon inicial declarado como base recurrente del escenario.

No reconstruye una supuesta “verdad bancaria” solo a partir de la tasa declarada.

La tasa de la cotización no se usa como sustituto de datos económicos que la oferta no declara.

## UVR

v0.19 no predice UVR.

Una cotización UVR requiere una trayectoria explícita para producir valores en pesos. En la UI actual se admite un escenario de sensibilidad de crecimiento anual constante definido por el usuario.

El resultado comunica de forma visible:

- que se trata de un supuesto de simulación;
- que no es una proyección oficial;
- que el resultado cambia si cambia la trayectoria UVR.

Sin ese supuesto, el motor se niega a ejecutar la modelación UVR correspondiente.

## Leasing habitacional

Cuando una alternativa es leasing, la economía de la opción de compra no se omite silenciosamente.

El usuario debe decidir explícitamente si el escenario incorpora adquisición mediante opción de compra cuando corresponda.

Si la opción está expresada como porcentaje y su base no queda determinada por los datos declarados, el escenario exige una base explícita.

Crédito hipotecario y leasing no se presentan como jurídicamente equivalentes porque un indicador de flujo resulte menor.

## Métricas

### Desembolso nominal modelado

Puede compararse únicamente cuando pasan los gates nominales definidos por el contrato.

Una salida válida puede identificar:

> **Menor desembolso nominal modelado bajo este escenario**

Esto no significa:

- mejor crédito;
- mejor banco;
- mejor producto;
- recomendación;
- ahorro garantizado;
- conveniencia jurídica;
- aprobación.

### Valor presente modelado

Solo existe cuando el usuario suministra una tasa anual de comparación.

Esa tasa es un supuesto para valorar flujos en fechas distintas. No se presenta como:

- tasa bancaria;
- tasa de mercado;
- tasa recomendada;
- costo de oportunidad correcto para el usuario.

Cuando la métrica supera sus gates, la UI puede identificar el menor valor presente modelado y la diferencia correspondiente bajo ese supuesto.

## Gates de comparabilidad

El contrato puede bloquear ranking por causas como:

- cotización no modelable;
- valores de inmueble distintos;
- montos financiados distintos;
- plazos distintos;
- falta de tasa de comparación para la métrica que la exige;
- adquisición final no equivalente entre alternativas.

El comportamiento correcto ante una diferencia material no es fabricar un ganador, sino mostrar ambos flujos y explicar por qué esa métrica no debe rankearse.

## Truth boundary

v0.19 sí puede:

- transformar C1 declarado + supuestos explícitos en flujo C2;
- mostrar componentes del flujo;
- calcular desembolso nominal modelado;
- calcular valor presente modelado cuando existe tasa de comparación;
- aplicar gates antes de identificar una alternativa con menor métrica;
- mostrar sensibilidad UVR bajo una trayectoria escogida por el usuario;
- conservar las cotizaciones in-memory durante el journey.

v0.19 no hace:

- verificación documental;
- OCR;
- persistencia;
- consulta de centrales;
- integración bancaria;
- Open Finance;
- preaprobación;
- aprobación;
- elegibilidad;
- probabilidad de aprobación;
- ranking de bancos;
- recomendación de producto;
- predicción UVR;
- ahorro garantizado;
- conclusión legal automática.

## UX

La secuencia pública queda:

**cotización A → diagnóstico C1 → cotización B → diferencias de base C1 → CTA “Modelar escenario económico” → supuestos estrictamente necesarios → resultado C2 → cambiar supuestos / volver / editar cotización**.

Editar una de las cotizaciones invalida el escenario económico mostrado, evitando conservar un resultado calculado con inputs obsoletos.

## E2E nuevos

La suite cubre, entre otros:

1. par en pesos sobre la misma base → comparación nominal habilitada;
2. crédito vs leasing con monto/plazo distintos → nominal no rankeable;
3. tasa de comparación explícita → valor presente habilitado cuando sus gates lo permiten;
4. UVR → bloqueo sin trayectoria y modelación solo tras supuesto explícito;
5. conservación de inputs al regresar a editar;
6. ausencia de datos financieros en la URL;
7. responsive behavior a 390 px.

## Decisión de producto congelada

**“Menor desembolso modelado” es una propiedad de una métrica bajo un escenario; nunca es sinónimo de “mejor financiación”.**

Ese principio deberá gobernar cualquier futura capa de tasas reales, entidades, matching, recomendación o marketplace.
