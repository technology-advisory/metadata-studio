# Plan de validación

1. PDF con Author/Creator/Producer/XMP: comprobar detección, saneamiento, hash y PDF de evidencia.
2. JPG con EXIF/GPS: comprobar categoría Ubicación y eliminación de APP1.
3. PNG con tEXt/iTXt/eXIf/tIME.
4. DOCX/XLSX/PPTX con autor, lastModifiedBy, company y custom properties.
5. MP3 con ID3: comprobar detección y generación del MP3 sin ID3.
6. ZIP con DOCX/JPG/PDF internos: comprobar árbol de hallazgos mediante `path`, saneamiento interno y reempaquetado.
7. ZIP con `../evil.txt`: debe impedir el reempaquetado.
8. TAR con uname/gname: comprobar saneamiento y checksum de cabecera recalculado.
9. MP4/MOV/WAV: comprobar inspección; el saneamiento debe avisar cuando no sea seguro.
10. 7Z/TAR.XZ/TAR.BZ2: comprobar que se detecta el contenedor y se informa de la limitación.
11. Fichero desconocido: debe mostrar tipo, tamaño y SHA-256, sin habilitar un saneamiento falso.
12. ZIP de evidencia: debe contener el fichero saneado y `MetadataStudio_Report.pdf`.

## Hardening v0.9.5

Pruebas obligatorias adicionales:
- rechazo antes de lectura para >256 MB (o >128 MB en comprimidos);
- extensión vs magic bytes;
- ZIP con central directory/offsets fuera de rango;
- ZIP/GZIP con salida descomprimida por encima del límite;
- ratio de compresión >200:1;
- ZIP con >1500 elementos para inspección;
- TAR truncado o con tamaños octales inválidos;
- PDF con /Encrypt, /ObjStm, /Type /XRef, XMP comprimido o múltiples %%EOF: debe fallar cerrado y no emitir verificación positiva.
