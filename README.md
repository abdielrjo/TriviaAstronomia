# Trivia de estrellas

App para el facilitador: sortea una variante por nivel, aplica los comodines y guarda cada ronda en el iPad.

## Archivos
- `index.html`, `app.js`: estructura y lógica.
- `styles.css`: estilos mínimos, solo funcionales. Reemplazar con el diseño definitivo.
- `banco.js`: las 70 preguntas. Se genera desde el .md, no editar a mano.
- `tools/build_banco.py`: regenera `banco.js` si cambia el banco:
  `python3 tools/build_banco.py ../banco-preguntas-trivia-estrellas_1.md > banco.js`

## Publicar
Subir la carpeta a un repositorio y activar GitHub Pages (Settings → Pages → rama `main`, carpeta raíz).

## En el iPad
1. Abrir la dirección en Safari y usar Compartir → Agregar a pantalla de inicio. Así Safari no borra los datos por inactividad.
2. Abrir siempre desde ese ícono, no desde Safari: son almacenamientos separados.
3. Activar Acceso Guiado (Ajustes → Accesibilidad) para bloquear el iPad en la app.
4. Exportar los CSV al final de cada jornada desde "Datos".

## Datos exportados
- `rondas_FECHA.csv`: ronda, fecha, hora, comodin_sacrificado, nivel_alcanzado, resultado (completada, fallo, abandonada, interrumpida).
- `intentos_FECHA.csv`: ronda, nivel, variante, comodines, opcion_elegida, acierto. La opción elegida usa la letra del banco (A es siempre la correcta), no la posición en pantalla.
