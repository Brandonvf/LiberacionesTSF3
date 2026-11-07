# Liberaciones TSF3

Registro de liberaciones topográficas de la presa de relaves: los topógrafos registran en campo (también sin señal), gabinete genera los protocolos y los entrega a Calidad, y el jefe de área ve el avance.

- `index.html`: la app completa (Firebase Firestore + acceso con Google).
- `sw.js`: permite abrir la app sin señal (guarda la página, el logo y Firebase al instalarse).
- `manifest.webmanifest` e `iconos/`: nombre, logo y atajos de la app instalada.
- `DESIGN.md`: guía de diseño («Cuaderno de obra»): colores, tipografía, botones, ventanas, tablas y filtros. Todo cambio visual la sigue.
- `firestore.rules`: reglas de seguridad. Se copian en Firebase → Firestore Database → Reglas → Publicar.

Incluye: acceso con Google y roles (operario, topógrafo, gabinete, jefe, administrador), registro en campo sin señal con CSV y fotos, bandeja de gabinete con código SKT-TOP único, panel («Qué falta», perfil por capas y planta) que lee un resumen por frente, modelo 2D para gabinete (eje y secciones de Civil 3D en LandXML más la superficie de cada liberación), confirmación antes de las acciones importantes, rechazo con motivo, papelera, «no se libera» rápido desde el panel, versión de computadora con menú lateral, buscador Ctrl+K, clic derecho y acciones en grupo, ajustes, depuración de fotos de entregados antiguos (Ajustes → Archivos), aviso de tramos superpuestos, avance por capa en planta real con XML base y porcentaje por área, corrección de entregados con motivo, exportación a CSV y app instalable con logo.

## Aspas para vuelo de dron

Los levantamientos de aspas registrados en campo llegan a la **Bandeja → Aspas** del administrador y del jefe de área (el jefe ve la Bandeja solo con esa pestaña; gabinete no la ve). Desde la ficha se descargan el CSV y las fotos, y se marcan como procesados uno por uno o varios juntos; también se pueden devolver a «Por procesar». El número del menú cuenta los que faltan procesar.

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
