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
| prueba10 | Ficha en pantallas medianas, «atrás», búsqueda por capa, aceptar sin señal, corregir entregados con motivo, superposición, depuración de fotos, jefe en Modelo 2D |
