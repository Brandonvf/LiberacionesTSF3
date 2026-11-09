# Pruebas de Liberaciones TSF3

Pruebas automáticas que abren la app en un navegador real (Chromium con Playwright) y revisan los flujos completos: registrar en campo sin señal, bandeja y código SKT-TOP único, panel, papelera, Modelo 2D, versión de computadora, celular, etc.

- **No usan Firebase real**: `fake/` es un Firebase simulado que guarda todo en el navegador. No gastan lecturas ni almacenamiento.
- **No usan datos reales**: `datos/` tiene un histórico, un eje y una liberación inventados, con la misma forma que los de obra. Se regeneran con los scripts `generar_historico.py`, `generar_eje.py` e `inventar_liberacion.py`.
- Las capturas de pantalla se guardan en `capturas/` (no se suben al repositorio).

## Cómo correrlas

Requisitos: Node.js, Python 3 y Playwright con Chromium.

```
npm i -D playwright && npx playwright install chromium
bash pruebas/correr.sh            # todas
bash pruebas/correr.sh prueba5    # una sola
```

| Prueba | Qué revisa |
|---|---|
| prueba | Entrar, registrar sin señal, editar, buscar, roles |
| prueba2 | Archivos (CSV y fotos), panel, ejes, capas, ajustes |
| prueba3 | Importar el histórico, reimportar sin duplicar, quitar importados |
| prueba4 | Progresiva, filtro de capas, huecos, Ajustes → Capas |
| prueba5 | Operario → gabinete (códigos únicos) → entrega → exportar CSV |
| prueba6 | Jefe con los mismos Ajustes que el administrador |
| prueba7 | Resumen por frente, «Qué falta» en celular, siguiente tramo, botón atrás |
| prueba8 | Modelo 2D: eje con secciones y superficie de una liberación |
| prueba9 | Computadora (menú lateral, Ctrl+K, clic derecho, ficha lateral), rechazar, papelera, «no se libera» |
| prueba11 | Avance por capa en planta real: base (superficie o contorno), cruces, fuera de la base, lista de capas con filtros, frente sin eje |
| prueba12 | App instalable: manifiesto, logo, botón «Instalar», número en el ícono, atajos, aviso de versión nueva y apertura sin señal |
| prueba13 | Mudanza de dirección: aviso en la dirección vieja y paso a la nueva solo cuando no queda nada por subir |
| prueba14 | Estilo «Cuaderno de obra»: ventanas emergentes (✕, Escape, «Atrás», tocar fuera, tamaños), filtros del panel (acordeón y hoja con «Aplicar»), búsqueda sin trabarse, hora actual y no perder lo escrito si falla la grabación |
| prueba15 | Aspas para vuelo de dron: llegan a la bandeja del administrador y del jefe de área, se descargan y se marcan como procesadas; gabinete no las ve; pestaña Levantamientos |
| prueba16 | «Qué se liberó»: buscador único que tolera errores, agregar tipos y elementos desde campo revisando parecidos, revisar y unir en Ajustes |
| prueba17 | Cambio de rol con la app abierta (aparece la Bandeja sin cerrar la app y sin perder lo escrito) y rol elegido al aprobar una solicitud |
| prueba18 | Equipo del levantamiento, filtros de Registros (fechas, tipo, frente, topógrafo, actividad, equipo) y levantamiento con dron con protocolos por zona |
| prueba19 | Fotos HEIC (Samsung con «alta eficiencia», iPhone): se convierten a JPG en el teléfono; si no se puede, explica qué hacer |
| prueba20 | Actualizaciones: al abrir con una copia vieja guardada se pone sola la versión nueva (si aún no se escribió nada); si se está escribiendo, avisa «Actualizar». Lo nuevo (dron, equipos) aparece aunque la lista de Firebase sea vieja |
| prueba21 | Capa al aceptar (uno y en grupo) con aviso de traslape, gabinete solo cambia la capa, levantamientos con «Enterado» (gabinete y jefe), resumen para WhatsApp en Mis registros y base de una capa en un frente vacío |
| prueba22 | Modelo 2D fácil de encontrar: frentes con modelo marcados, un frente vacío dice dónde sí hay, la capa con base se elige sola con su porcentaje y se recuerda la capa elegida en cada frente |
| prueba10 | Ficha en pantallas medianas, «atrás», búsqueda por capa, aceptar sin señal, gabinete sin «Editar» (solo cambiar capa), superposición, depuración de fotos, jefe en Modelo 2D |

`capturas.js` toma fotos de las pantallas principales en celular y computadora (`node pruebas/capturas.js <carpeta>`), útil para comparar antes y después de un cambio de diseño. `filtros.js` reúne las ayudas que usan las pruebas para manejar los filtros del panel.
