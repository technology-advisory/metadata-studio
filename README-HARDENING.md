# Metadata Studio v0.9.5 — Hardening

Esta versión corrige H-01, H-02, H-03, H-04 y H-05 de la auditoría de seguridad. H-06 (cabeceras/CSP del hosting) queda expresamente fuera y debe configurarse en Cloudflare.

## Límites de seguridad
- Entrada general: 256 MB.
- Entrada de comprimidos: 128 MB.
- Salida agregada de contenedores: 256 MB.
- Entrada ZIP individual descomprimida: 128 MB.
- Ratio máximo de compresión: 200:1.
- Máximo estructural ZIP: 3000 entradas.
- Máximo de entradas analizadas en contenedores: 1500.
- Máximo de hijos inspeccionados profundamente dentro de ZIP: 120 / 128 MB reales.

## PDF fail-closed
El motor PDF solo sanea/verifica el subconjunto que puede tratar sin reescribir la estructura. Rechaza PDFs cifrados, actualizaciones incrementales, Object Streams, XRef streams y XMP comprimido. El objetivo es evitar un falso «sin hallazgos» cuando el analizador no puede demostrar cobertura suficiente.

## Cloudflare
No se incluyen CSP/HSTS/Permissions-Policy/COOP/CORP. Es H-06 y se aplicará en la capa Cloudflare tras validar la aplicación.
