# VIVIENDA

VIVIENDA es un producto LegalTech/FinTech para entender, comparar, optimizar y proteger decisiones asociadas al crédito de vivienda en Colombia.

Este repositorio contiene el diseño y la implementación del **Warm Path borrower vertical slice v0.2**.

## Estado del vertical slice

El flujo ejecutable actual cubre:

1. Home Warm Path.
2. `/revisar` · Quick Check anónimo de cinco pasos.
3. Resultado C1 con datos declarados.
4. C1 → C2 mediante simulación modelada para créditos compatibles en pesos con cuota constante.
5. `/verificar` · demostración local de revisión documental.
6. Reconciliación explícita de campos materiales.
7. Mortgage Twin `preview` separado de un futuro estado `verified`.

### Contrato de precisión

- **C0**: orientación.
- **C1**: estimación.
- **C2**: simulación modelada.
- **C3**: verificado documentalmente.

C3 no es un badge decorativo. Requiere evidencia `document_derived` y reconciliación completa de los campos materiales. La evidencia simulada nunca puede conceder C3, aunque el usuario confirme todos sus valores.

## Motor financiero inicial

El primer motor soporta únicamente el caso explícito:

- crédito en pesos;
- cuota constante;
- tasa EA confirmada;
- cuotas restantes confirmadas;
- abono adicional positivo.

No se aplica la fórmula de anualidad en pesos a créditos UVR. El capital adicional aportado por el usuario se informa por separado y nunca se presenta como ahorro generado por VIVIENDA.

## Desarrollo

Requisitos:

- Node.js 22.12 o superior.

```bash
npm ci
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Playwright ejecuta el borrower journey sobre un build de producción (`next build` + `next start`), no sobre HMR/Turbopack de desarrollo.

## CI

`Frontend CI` verifica:

- instalación reproducible con `npm ci`;
- TypeScript estricto;
- tests de dominio y golden vectors;
- build de Next;
- E2E Chromium desktop;
- E2E móvil 390 px;
- navegación por teclado;
- progreso semántico;
- ausencia de overflow móvil;
- guardrails C1/C2/C3;
- validación de archivo documental;
- provenance del Mortgage Twin;
- home sin C3 decorativo ni CTAs hacia anchors inexistentes.

Baseline validado el 25/26 de agosto de 2026:

- head: `af2b7f84ad3b5449dd07888b769bab167caf9813`;
- verify: PASS;
- E2E: **22/22 PASS** sobre servidor de producción;
- PR: `#7`, todavía en draft.

## Preview Vercel

El código está listo para preview y contiene `noindex` más cabeceras defensivas. El intento de deployment llegó hasta la creación inicial de Vercel, pero la API administrativa del team devuelve un bloqueo RBAC para Preview Deployments. No se ha forzado producción ni se ha debilitado el gate para evitar ese bloqueo.

El PR debe permanecer en draft hasta que un preview accesible pueda auditarse renderizado en `/`, `/revisar` y `/verificar`.

## Seguridad del preview

- `robots`: noindex / nofollow / nocache;
- `X-Robots-Tag: noindex, nofollow, noarchive`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy`: cámara, micrófono, geolocalización y pagos deshabilitados.

CSP se posterga hasta implementar correctamente nonces para Next; no se añadirá una política superficial que rompa hidratación.

## Fuera de alcance deliberadamente en este slice

- OCR productivo;
- transferencia/persistencia de extractos financieros;
- autenticación y base de datos;
- motor UVR completo;
- adapters bancarios productivos;
- representación jurídica automática;
- vertical de compra de vivienda.
