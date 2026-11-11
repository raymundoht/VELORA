# VELORA — Proyecto actualizado

Incluye el hero con la imagen de los equipos y efecto de inclinación, diseño adaptable a celular, transiciones suaves, logo original en el encabezado, nuevo favicon y footer sin el logo grande. No incluye precios ni la frase eliminada.

## Cómo ejecutarlo
Descomprime el ZIP. Desde la carpeta VELORA ejecuta:

    python3 -m http.server 8000 --directory dist

En Windows puedes usar `py` en lugar de `python3`. Abre http://localhost:8000 en el navegador.

No requiere npm ni compilación. Para hospedarlo, sube el contenido de dist a la raíz del sitio.

## Archivos principales
- dist/index.html: contenido y estructura.
- dist/refined.css: estilos y adaptación a dispositivos.
- dist/interaction.js: menú, formulario, transiciones e inclinación del hero.
- dist/velora-logo.png: logo del encabezado.
- dist/velora-hero.png: imagen del hero.
- dist/favicon.ico y favicon-*.png: iconos del navegador.
- dist/apple-touch-icon.png: icono para dispositivos Apple.

El hero y la sección "La colección" usan una escena 3D (hero3d.js, Three.js por CDN): mármol negro con luz roja, recorrido de cámara guiado por scroll y fichas por equipo. Si el navegador no tiene WebGL se muestra la fotografía. Los modelos .glb hechos con IA se agregan en modelos/ (ver modelos/LEEME.md). Las animaciones respetan la preferencia de movimiento reducido del sistema.

Requiere internet para Tailwind CSS, Google Fonts, Font Awesome e imágenes de Unsplash.

El teléfono configurado es 526145989483 y el correo es velorascent1@gmail.com. El formulario envía los datos por correo (vía FormSubmit.co) y también genera un mensaje de WhatsApp.
