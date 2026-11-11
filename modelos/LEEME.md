# Modelos 3D de los equipos

El hero (`hero3d.js`) muestra los equipos en 3D. Mientras no haya archivos aquí, usa
modelos hechos en código. En cuanto pongas un `.glb` con el nombre correcto, la escena
lo carga sola: lo escala a la altura correcta y lo coloca sobre la plataforma.

| Archivo que debes crear     | Equipo           | Foto de referencia                        |
|-----------------------------|------------------|-------------------------------------------|
| `equipo-chico.glb`          | Chico (300 m²)   | `referencias/equipo-chico-blanco.png`     |
| `equipo-mediano.glb`        | Mediano (500 m²) | `referencias/equipo-mediano-blanco.png`   |
| `equipo-grande.glb`         | Grande (2000 m²) | `referencias/equipo-grande-torre.png`     |

(`referencias/equipo-mediano-negro.png` es la versión negra del Mediano, por si la quieres.)

## Cómo generarlos con IA (imagen → 3D)

1. Entra a un generador de imagen a 3D: Meshy (meshy.ai), Tripo (tripo3d.ai) o Rodin (hyper3d.ai).
2. Sube la foto de referencia. Da mejor resultado con una foto propia del equipo,
   de frente, sobre fondo liso y bien iluminada; los recortes de la carpeta `referencias`
   salen del hero y tienen baja resolución.
3. Activa la textura (PBR) y descarga en formato **GLB**.
4. Renómbralo como dice la tabla y ponlo en esta carpeta.
5. Recomendado: comprímelo para que la página cargue rápido (menos de ~3 MB por modelo):
   `npx @gltf-transform/cli optimize entrada.glb equipo-chico.glb --texture-compress webp`

El frente del modelo debe mirar hacia +Z (hacia la cámara). Si al cargarlo aparece
de espaldas o de lado, avísame y le agrego la rotación en `hero3d.js`.
