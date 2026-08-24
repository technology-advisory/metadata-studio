# Metadata Studio — OpenTrust

Versión de validación integral. Aplicación estática que inspecciona y sanea metadatos localmente en el navegador. No existe backend ni subida de archivos.

## Funciones incluidas

- Interfaz en español, estilo OpenTrust / Link Studio.
- Perfiles: Estándar, Privacidad máxima, Publicación web, Corporativo y Personalizado.
- Categorías propias: Identidad, Ubicación, Dispositivo, Software/Sistema, Fechas, Ocultos, Multimedia, Archivo comprimido y Documento.
- Puntuación de riesgo orientativa y huella de privacidad.
- SHA-256 del original y de la copia saneada.
- Comparación antes/después.
- Descarga solo del fichero limpio o ZIP con fichero limpio + `MetadataStudio_Report.pdf`.
- Inspección universal de cualquier fichero (tipo, tamaño y SHA-256), aunque solo los formatos con saneador específico pueden modificarse.

## Formatos

### Inspección + saneamiento
- PDF: Info Dictionary y XMP compatible con el limpiador actual.
- JPG/JPEG: EXIF, GPS, XMP, IPTC/Photoshop y comentarios.
- PNG: tEXt/iTXt/zTXt, EXIF y tIME.
- DOCX/XLSX/PPTX: propiedades core/app/custom.
- MP3: ID3 (el saneamiento elimina el bloque ID3 completo cuando se selecciona).
- ZIP: estructura, rutas inseguras e inspección de ficheros internos compatibles; reempaquetado local y saneamiento de contenidos compatibles seleccionados.
- TAR: estructura, usuario/grupo de cabeceras; saneamiento de esos campos.

### Inspección específica
- MP4/MOV/M4A: búsqueda de átomos/metadatos comunes (ubicación, dispositivo, software, autor/título cuando aparecen de forma reconocible).
- WAV: chunks LIST/INFO, bext, iXML e ID3.
- FLAC/OGG/WebM/MKV/AVI: detección ligera de etiquetas textuales conocidas.
- GZ/TGZ/TAR.GZ: descompresión local mediante `DecompressionStream` e inspección TAR cuando corresponde.

### Detección de contenedor / inspección universal
- 7Z
- TAR.BZ2
- TAR.XZ

Estos tres formatos se identifican, pero la inspección interna profunda necesita un decodificador 7Z/BZip2/XZ/WASM local que no se incluye todavía. La interfaz lo indica expresamente y no promete saneamiento.

## Seguridad de archivos comprimidos

- Rechazo de rutas absolutas o con `..` al reempaquetar ZIP.
- Límite de 1.500 entradas mostradas.
- Aviso si el tamaño descomprimido declarado supera 512 MiB.
- Inspección profunda ZIP limitada a 120 ficheros y 128 MiB por pasada.
- No se ejecuta contenido.
- No se siguen enlaces simbólicos.

## Ejecución local

```bash
python -m http.server 8080
```

Abrir `http://localhost:8080`.

## Nota de alcance

Metadata Studio no utiliza la frase “0 metadatos”. La verificación significa que no se han detectado metadatos sensibles mediante los controles compatibles con el formato analizado. Algunos formatos pueden contener estructuras no cubiertas por esta versión.
