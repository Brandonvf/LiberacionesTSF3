# DESIGN.md · Liberaciones TSF3

Guía de diseño de la app. Todo lo que se construya o se cambie en `index.html` sigue esto.
Dirección elegida: **«Cuaderno de obra»**: una herramienta de trabajo plana, clara y de alto contraste,
pensada para leerse con sol en la pantalla del celular y para trabajar rápido en la computadora.
No es una página de presentación: nada decorativo que no ayude a registrar, revisar o encontrar algo.

## 1. Principios

1. **Primero el dato.** Códigos, progresivas, capas y estados se leen antes que cualquier adorno.
2. **Plano y firme.** Sin sombras difusas, sin degradados, sin tarjetas dentro de tarjetas. Los bloques se separan con líneas finas y espacio, no con cajas flotantes.
3. **Un solo acento.** El verde de la app marca lo que se puede tocar o lo que está activo. Los demás colores solo dicen estado (pendiente, en proceso, entregado, observado, rechazado).
4. **Esquinas discretas.** Radio de 8 px en todo (botones, campos, bloques, diálogos). Nada en píldora salvo las etiquetas de estado.
5. **Texto corto y en español.** Títulos de una línea, explicaciones de una frase. Nunca una palabra en inglés en la interfaz.
6. **Movimiento sí, pero breve.** Las animaciones se mantienen (entradas, cambios de estado, el punto de conexión que late), siempre de 150 a 250 ms y sin rebotes.
7. **Igual en celular y computadora.** Mismos colores, tipos y componentes; cambia solo el acomodo (columna en PC, hojas y acordeones en celular).

## 2. Color

Variables en `:root`. No se usan colores sueltos en el CSS ni en el JS: siempre la variable.

| Variable | Valor | Uso |
|---|---|---|
| `--bg` | `#f4f6f5` | Fondo de la app |
| `--surface` | `#ffffff` | Bloques, tablas, diálogos |
| `--surface-2` | `#eaefed` | Filas alternas, cabeceras de tabla, fondos de chips apagados |
| `--ink` | `#111c19` | Texto principal |
| `--muted` | `#5b6966` | Texto secundario, etiquetas |
| `--line` | `#cfd9d6` | Líneas divisorias y bordes (1 px) |
| `--line-strong` | `#9fb0ab` | Borde de campos al pasar el cursor, separadores de secciones |
| `--accent` | `#0b7d72` | Botón principal, enlaces, elemento activo, foco |
| `--accent-strong` | `#06665d` | Botón principal presionado, texto sobre fondo claro de acento |
| `--accent-soft` | `#dcefeb` | Fondo de lo seleccionado o activo |
| `--pt` | `#56636e` | Estado Pendiente topografía |
| `--ep` | `#9a5a00` | Estado En proceso |
| `--ec` | `#1f7a45` | Estado Entregado a Calidad |
| `--ob` | `#b8321a` | Estado Observado y acciones peligrosas |
| `--re` | `#7a2d6b` | Estado Rechazado |
| `--falta` | trama diagonal `#fdf3f0` / `#f0c4b8` | «Falta liberar» en el gráfico |
| `--nolib` | trama cruzada `#c4ceca` / `#aebab5` | «No se libera» en el gráfico |

Reglas:
- El fondo de la app es `--bg`; los bloques de contenido son `--surface` con borde `--line`. No hay fondos oscuros (salvo el menú contextual y los avisos flotantes, que usan `--ink`).
- Las etiquetas de estado llevan fondo del color del estado al 12 % y texto del color pleno. Siempre con el nombre completo del estado, nunca solo color.
- Contraste mínimo 4.5:1 en todo texto. `--muted` sobre `--surface` cumple; no se usan grises más claros para texto.

## 3. Tipografía

- **Interfaz:** `Inter`, con respaldo `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Pesos 400, 600 y 700. Sustituye a Nunito y Nunito Sans.
- **Números técnicos:** `IBM Plex Mono` 500 para códigos SKT-TOP, progresivas (0+020), cotas, áreas y fechas en tablas. Activar `font-variant-numeric: tabular-nums` en toda la app para que las columnas de números queden alineadas.
- Escala (px): 12 etiquetas y notas · 14 texto de tablas y listas · 15 texto base en celular, 14 en PC · 17 títulos de bloque · 22 título de pantalla. Una sola familia de tamaños; no se inventan intermedios.
- **Etiquetas de campo y cabeceras de tabla:** 12 px, peso 600, mayúsculas con `letter-spacing: .04em`, color `--muted`. Es el rasgo más reconocible del estilo; se usa en todas.
- Interlineado 1.45 en párrafos, 1.2 en títulos. Sin cursivas.

## 4. Espacio, bordes y capas

- Escala de espacio: 4 · 8 · 12 · 16 · 24 · 32 px. Nada fuera de la escala.
- Radio único: **8 px** (6 px en chips y etiquetas que se tocan). La cápsula (999 px) solo para estados, globos y contadores; casillas, 4 px.
- Bordes de 1 px `--line`. Las secciones dentro de un bloque se separan con una línea `--line` de lado a lado, no con otro bloque.
- **Sombras:** ninguna en tarjetas, bloques, botones ni campos. Solo los elementos que flotan de verdad (menú contextual, diálogos, avisos, hoja inferior) llevan `0 8px 24px rgba(17,28,25,.16)`.
- Sin degradados en ninguna parte (el logo en el ícono de la app es la única excepción, porque ya está publicado).
- Márgenes laterales: 16 px en celular, 24 px en PC. Ancho máximo del contenido en PC: 1280 px.

## 5. Componentes

### Botones
Altura 44 px (40 en tablas y barras densas), radio 8 px, texto 600, padding 0 16 px. Nunca más de un botón principal visible por bloque.
- **Principal:** fondo `--accent`, texto blanco. Presionado: `--accent-strong`.
- **Secundario:** fondo `--surface`, borde 1 px `--line-strong`, texto `--ink`.
- **De texto:** sin fondo ni borde, texto `--accent`; para acciones menores («Limpiar», «Ver más»).
- **Peligroso:** como el secundario pero borde y texto `--ob`; el fondo rojo pleno solo en la confirmación final.
- Ícono + texto siempre alineados en una fila (`display:inline-flex; gap:8px`), ícono de 18 px y trazo 2.
- Estado deshabilitado: opacidad .5 y cursor normal. Cargando: el texto cambia («Guardando…») y el botón se bloquea.

### Campos
Altura 44 px, borde 1 px `--line`, radio 8, fondo `--surface`, texto 15/14 px. Al enfocar: borde `--accent` y anillo de 3 px `--accent-soft`. Etiqueta arriba en mayúsculas pequeñas (ver tipografía). Texto de ayuda debajo en 12 px `--muted`. Error: borde `--ob` y mensaje en 12 px `--ob`. En iPhone, los campos de fecha deben forzar `-webkit-appearance:none` y texto a la izquierda.

### Chips de filtro
Altura 32 px (44 px en celular y tableta), radio 6 px, borde 1 px `--line`, texto 13 px 600. Activo: fondo `--accent-soft`, borde `--accent`, texto `--accent-strong`. Con conteo: el número en `--muted` a la derecha. Un chip activo que se puede quitar muestra ✕ al final.

### Tablas (computadora)
Cabecera con fondo `--surface-2` y texto en mayúsculas pequeñas; filas de 44 px separadas por líneas `--line`; al pasar el cursor, fondo `--surface-2`; fila seleccionada, fondo `--accent-soft` y borde izquierdo de 3 px `--accent`. Números y códigos en monoespaciada. Sin bordes verticales.

### Listas y tarjetas (celular)
Una tarjeta por registro, borde 1 px `--line`, radio 8, padding 12. Primera fila: código en monoespaciada + etiqueta de estado. Segunda: descripción en una o dos líneas. Tercera: datos cortos separados por « · ». Sin sombra; al tocar, fondo `--surface-2` 150 ms.

### Diálogos (ventanas emergentes)
- Siempre con **✕ arriba a la derecha**, de 44 × 44 px, además del botón «Cancelar». Se cierran con ✕, con «Cancelar», tocando fuera y con «Atrás» del celular o Escape. Una confirmación destructiva no se cierra tocando fuera (solo con ✕ o «Cancelar»), para evitar toques accidentales.
- **Tamaño por contenido:** ancho 360 px para confirmaciones, 480 px para formularios cortos, 640 px máximo. Alto máximo 80 % de la pantalla con desplazamiento interno. Nunca una confirmación de dos frases ocupa media pantalla.
- **En celular (< 760 px):** hoja desde abajo, pegada al borde inferior, con asa de 36 × 4 px, radio 12 solo arriba, y `padding-bottom` que respete el área segura. Las confirmaciones cortas también van como hoja, de alto mínimo.
- Estructura fija: título 17 px, texto o campos, fila de botones con el principal a la derecha en PC y arriba (ancho completo) en celular. El botón de la acción dice lo que hace («Mandar a la papelera», «Generar 3 códigos»), nunca «Aceptar».
- Entrada: 180 ms, desvanecer + 8 px de desplazamiento. Fondo oscurecido `rgba(17,28,25,.45)`.

### Menú contextual y hoja de acciones
Fondo `--ink`, texto blanco, radio 8, opciones de 40 px, ícono opcional de 18 px. Acción peligrosa en `#ffb4a6`. En celular, hoja desde abajo con los mismos ítems.

### Avisos (toast)
Fondo `--ink`, texto blanco 14 px, radio 8, abajo centrado en celular y abajo a la derecha en PC; 3.6 s, 6 s si es error. Con señal pendiente: punto ámbar al inicio. Máximo una línea y media.

### Acordeón de filtros (panel en computadora, opción B)
Columna izquierda de 260 px. Secciones: Frente (siempre visible), Filtros, Progresiva, Capas. Cabecera de sección de 44 px con el nombre en 600 y un resumen en `--muted` a la derecha («Entregado · Gregorio N.», «Todo el frente», «113 de 113»); solo una sección abierta a la vez (las demás se pliegan solas). En Capas: buscador arriba, botones Todas · Ninguna · Últimas 5, y los grupos por tipo plegados con su conteo; se despliega solo el grupo que se toca.

### Filtros en celular
Un solo renglón «Filtros · Capas 113 de 113» debajo del selector de frente, plegado por defecto. Al tocarlo se abre una hoja desde abajo con el mismo acordeón de la computadora y un botón «Aplicar» fijo abajo. Lo activo se muestra como chips removibles encima del gráfico.

### Gráfico
Se conserva: tramas para «falta liberar» y «no se libera», barras de color por estado, eje de progresivas en monoespaciada. Fondo del gráfico `--surface`, líneas de referencia `--line`. Leyenda en 12 px, en una sola fila con desplazamiento horizontal en celular.

### Íconos
Trazo de 2 px, 20 px en el menú y 18 px en botones, color del texto que acompañan. Un solo juego (el actual, estilo línea). Nunca emojis en la interfaz.

## 6. Pantallas y navegación

- **Cabecera:** 56 px, fondo `--surface`, línea inferior `--line`; a la izquierda el nombre de la app en 700 («Liberaciones» + «TSF3» en `--muted`), a la derecha el nombre de la persona y «Salir» como botón de texto.
- **Menú:** en celular barra inferior de 64 px con ícono + texto 12 px, activo en `--accent` con línea superior de 2 px (no con fondo de píldora). En PC, columna izquierda de 240 px con fondo `--surface` y línea derecha `--line`; el ítem activo tiene fondo `--accent-soft` y borde izquierdo de 3 px.
- **Pantalla:** título 22 px, una línea de explicación en `--muted` solo si hace falta (en celular se oculta), y el contenido en bloques separados por 16 px.
- **Pantalla de entrada:** fondo `--bg`, bloque blanco de 360 px con el logo (sin sombra ni degradado alrededor), nombre, una frase y el botón «Entrar con Google». «Instalar como app» como botón secundario debajo cuando el navegador lo permita.

## 7. Textos

- Verbos directos en los botones: «Guardar liberación», «Restaurar», «Generar código».
- Mensajes de error dicen qué pasó y qué hacer: «Sin señal. Se subirá cuando vuelva», no «Error de red».
- Fechas como 07/11/2026 y horas 14:35; progresivas como 2+140; áreas con separador de miles «1 250 m²».
- Nada de signos de exclamación ni frases de relleno («¡Listo!», «Genial»).

## 8. Lo que no se hace (el «look de IA» que se evita)

- Tarjetas con sombra suave dentro de otras tarjetas.
- Degradados, brillos, bordes de colores pastel por todos lados.
- Todo redondeado en píldora (botones, campos, bloques).
- Tipografía redondeada y «amigable» en toda la interfaz.
- Párrafos explicativos debajo de cada título.
- Íconos distintos de estilo en una misma pantalla, o emojis.
- Colores de estado usados como decoración.
- Animaciones largas, rebotes o elementos que se mueven sin que la persona haya hecho nada.

## 9. Accesibilidad y uso en campo

- Zonas de toque de 44 px mínimo; separación de 8 px entre acciones.
- Foco visible siempre (anillo `--accent-soft` de 3 px).
- `aria-pressed` en chips y pestañas, `aria-current="page"` en el menú, `role="dialog"` con `aria-labelledby` en diálogos.
- Respetar `prefers-reduced-motion`: las animaciones pasan a 0 ms.
- Área segura del iPhone (`env(safe-area-inset-*)`) en cabecera, menú inferior y hojas.

## 10. Reglas para obra

Se usan en campo, con sol y a veces con guantes. Toda pantalla nueva las cumple.

- **Alturas.** En computadora: `--h-btn` 44 px (acción principal), `--h-mini` 40 px (secundaria) y `--h-tag` 32 px (etiqueta). En celular y tableta (hasta 1023 px), todo lo que se toca mide al menos 44 px; los botones cuadrados, 44 × 44 px.
- **Letra mínima en celular:** 13 px; 12 px solo en el menú inferior. En los gráficos, 12 px para escalas y 13 px para nombres y porcentajes. Sin mayúsculas forzadas en las etiquetas de campo.
- **Esquinas:** 6 a 8 px. La cápsula (999 px) solo para estados, globos y contadores.
- **Estados:** cada uno con su color, y «Observado» además con rayado (patrón `obs`), para que se distinga en gris o con daltonismo.
- **Acciones:** toda acción tiene un botón visible (por ejemplo «⋯» en filas y tarjetas, o el ojo para ocultar una capa); el clic derecho y la pulsación larga quedan solo como atajo.
- **Menú del celular:** como máximo 5 botones abajo; si sobran, «Ajustes» pasa a un engranaje en la cabecera.
- **Palabras:** «Enterado» (no «Visto»), «Panel», «Mis registros» (corto: «Míos», solo en el menú del celular).
- **Movimiento:** el punto de conexión solo late cuando hay algo por subir.

