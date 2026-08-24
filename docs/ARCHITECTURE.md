# Arquitectura

Aplicación estática 100% cliente.

- `js/core/utils.js`: utilidades, SHA-256, rutas seguras.
- `js/core/risk.js`: clasificación y puntuación de riesgo.
- `js/core/profiles.js`: perfiles de saneamiento.
- `js/core/report-pdf.js`: informe PDF local sin backend.
- `js/core/zip-lite.js`: lectura/reconstrucción ZIP para OOXML y ZIP.
- `js/core/zip-create.js`: creación del paquete de evidencia.
- `js/engines/*`: analizadores/saneadores por familia.
- `js/app.js`: orquestación, UI, verificación y descargas.

Los motores nunca envían bytes fuera del navegador. No hay fetch, XHR ni WebSocket.
