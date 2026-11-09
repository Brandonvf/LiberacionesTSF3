# Liberaciones TSF3

Registro de liberaciones topográficas de la presa de relaves: los topógrafos registran en campo (también sin señal), gabinete genera los protocolos y los entrega a Calidad, y el jefe de área ve el avance.

- `index.html`: la app completa (Firebase Firestore + acceso con Google).
- `sw.js`: permite abrir la app sin señal (guarda la página, el logo y Firebase al instalarse).
- `lib/heic2any.min.js`: conversor de fotos HEIC a JPG (se baja solo si hace falta).
- `manifest.webmanifest` e `iconos/`: nombre, logo y atajos de la app instalada.
- `DESIGN.md`: guía de diseño («Cuaderno de obra»): colores, tipografía, botones, ventanas, tablas y filtros. Todo cambio visual la sigue.
- `firestore.rules`: reglas de seguridad. Se copian en Firebase → Firestore Database → Reglas → Publicar.

Incluye: acceso con Google y roles (operario, topógrafo, gabinete, jefe, administrador), registro en campo sin señal con CSV y fotos, bandeja de gabinete con código SKT-TOP único, panel («Qué falta», perfil por capas y planta) que lee un resumen por frente, modelo 2D para gabinete (eje y secciones de Civil 3D en LandXML más la superficie de cada liberación), confirmación antes de las acciones importantes, rechazo con motivo, papelera, «no se libera» rápido desde el panel, versión de computadora con menú lateral, buscador Ctrl+K, clic derecho y acciones en grupo, ajustes, depuración de fotos de entregados antiguos (Ajustes → Archivos), aviso de tramos superpuestos, avance por capa en planta real con XML base y porcentaje por área, corrección de entregados con motivo, exportación a CSV y app instalable con logo.

## Tipos de liberación y elementos

- En «Nueva», Elemento y Tipo son un solo buscador **«Qué se liberó»**: arriba salen los tipos que más usa cada persona, y al escribir encuentra el tipo aunque tenga tildes, mayúsculas, plurales, letras cambiadas, palabras en otro orden o abreviaturas («rell trans» → Relleno de transición). El elemento se pone solo.
- Topógrafos, operarios y gabinete pueden **agregar** un tipo (y su elemento, si hace falta). Antes de crearlo la app muestra los nombres parecidos que ya existen y ofrece usar ese; si es el mismo nombre escrito distinto, no deja crearlo. Los números cuentan: «filtro 3» es distinto de «filtro 2». Hace falta señal.
- Lo agregado desde campo se usa al instante y aparece en **Ajustes → Tipos → Agregados desde campo** (el menú lo avisa) para que administrador o jefe lo marquen como revisado o lo **unan** con otro: sus registros pasan al nombre correcto y el repetido se quita.

## Equipo y levantamiento con dron

- En «Nueva» se marca el **Equipo** con que se hizo (Estación total, GNSS o Dron; la lista se edita en Ajustes → Tipos). Es obligatorio al registrar y el siguiente registro ya viene con el mismo.
- **Levantamiento con dron** es una actividad propia: el equipo queda en Dron y el registro llega a la Bandeja de gabinete como «Por aceptar».
- Al aceptarlo, gabinete ve marcados los **protocolos de esa zona** y puede quitar o agregar. Los protocolos y las zonas (estructura completa o frentes) donde aplica cada uno se arman en **Ajustes → Protocolos**.
- En Ajustes → Protocolos también se elige si se genera **un código SKT-TOP por protocolo** (por defecto) o **uno solo** para todo el levantamiento. Los códigos salen seguidos del mismo correlativo; en las listas se ve «+2» junto al código cuando hay más de uno.

## Fotos HEIC

Las cámaras Samsung con «Imágenes de alta eficiencia» y los iPhone guardan fotos HEIC, que el navegador del celular no abre. La app las convierte a JPG en el teléfono antes de reducirlas, con `lib/heic2any.min.js` (licencia MIT), que solo se baja cuando hace falta; con señal se deja guardado en segundo plano una vez, para poder convertir también sin señal en campo. Si no se puede convertir, la app explica qué hacer (conectarse o desactivar «Imágenes de alta eficiencia» en la cámara).

## Filtros de Registros

Registros y Mis registros filtran por **fecha en campo** (hoy, ayer, últimos 7 días, este mes, un día o entre fechas), **tipo de liberación**, **frente** (o toda la estructura), **topógrafo**, **actividad** y **equipo**, además de la búsqueda y el estado. En computadora es una barra sobre la tabla; en el celular, un renglón que abre una hoja con «Aplicar» y chips con lo activo. Con fechas, Registros pide a Firebase justo ese rango, así encuentra también registros antiguos.

## Aspas para vuelo de dron

Los levantamientos de aspas registrados en campo llegan a la **Bandeja → Aspas** del administrador y del jefe de área (el jefe ve la Bandeja con Aspas y Levantamientos; gabinete no ve Aspas). Desde la ficha se descargan el CSV y las fotos, y se marcan como procesados uno por uno o varios juntos; también se pueden devolver a «Por procesar». El número del menú cuenta los que faltan procesar.

## Gabinete: capa, traslape y sin editar lo de campo

Gabinete no edita lo que registra campo: acepta (y genera el código), observa, rechaza, entrega a Calidad y pone o corrige la capa. Al aceptar (uno o en grupo) o al cambiar la capa, la app avisa al instante si el tramo se superpone con otra liberación del mismo frente, tipo y capa. En campo la capa sigue siendo opcional. El administrador edita todo.

## Levantamientos en la Bandeja

Los levantamientos de campo (sin código) llegan a la pestaña «Levantamientos» de gabinete, jefe de área y administrador. Se marcan «Enterado» (uno o varios); quien lo registró ve «Enterado» en Mis registros. Se muestran como «Levantamiento» (antes «Sin liberación»).

## Resumen para WhatsApp

En Mis registros, «Resumen WhatsApp» arma el texto de hoy, ayer, ayer y hoy o de lo filtrado: por día y frente, con tipo, capa, PK, metros y código, y el total. Se puede corregir, copiar o abrir directo en WhatsApp.

## Modelo 2D: base de una capa

En un frente vacío se puede empezar subiendo la base (borde o superficie) de una capa: la capa se elige o se escribe al subirla, sin pasar por Ajustes. «Subir XML» reconoce un borde como base y, si es una superficie suelta, pregunta si es base o liberación. Después se suben las liberaciones poco a poco y el porcentaje se completa. En la lista de frentes se marcan los que ya tienen modelo (p. ej. «Presa Auxiliar Norte · 3 liberaciones + base»); un frente vacío dice dónde sí hay modelo; al abrir un frente se elige sola la capa con base para ver su porcentaje, y se recuerda la capa elegida en cada frente.

## Panel: filtros

- **Computadora:** columna izquierda con el frente y un acordeón (Filtros, Progresiva, Capas); se abre una sección a la vez y cada una muestra su resumen cerrada. En Capas hay buscador y los tipos se despliegan solo al tocarlos. Los cambios se aplican al instante.
- **Celular y tableta:** un solo renglón «Filtros · Capas 113 de 113» que abre una hoja desde abajo con lo mismo; se aplica al tocar «Aplicar».
- Lo que está filtrado aparece como chips encima del gráfico; la ✕ de cada chip lo quita.

## Instalar como app

- **Android (Chrome):** abrir la página y tocar «Instalar como app» en la pantalla de entrada o «Instalar» en la cabecera (también en el menú ⋮ → «Instalar app»).
- **iPhone (Safari):** botón Compartir → «Agregar a inicio».
- **Computadora (Chrome o Edge):** botón «Instalar» de la cabecera o el ícono de instalar en la barra de direcciones.

Ya instalada abre en su propia ventana, sin barra del navegador, y funciona sin señal. Mantener presionado el ícono muestra atajos (Nueva, Mis registros, Bandeja, Panel). El ícono muestra un número con lo pendiente (observados, bandeja y solicitudes de acceso, según el rol). Cuando se publica una versión nueva con la app abierta aparece «Hay una versión nueva · Actualizar». La app pide al teléfono no borrar lo guardado sin señal cuando falta espacio.

- `pruebas/`: pruebas automáticas con Firebase simulado y datos inventados (ver `pruebas/README.md`).
