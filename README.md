# Liberaciones TSF3

Registro de liberaciones topográficas de la presa de relaves: los topógrafos registran en campo (también sin señal), gabinete genera los protocolos y los entrega a Calidad, y el jefe de área ve el avance.

- `index.html`: la app completa (Firebase Firestore + acceso con Google).
- `sw.js`: permite abrir la app sin señal (guarda la página, el logo y Firebase al instalarse).
- `manifest.webmanifest` e `iconos/`: nombre, logo y atajos de la app instalada.
- `firestore.rules`: reglas de seguridad. Se copian en Firebase → Firestore Database → Reglas → Publicar.

Incluye: acceso con Google y roles (operario, topógrafo, gabinete, jefe, administrador), registro en campo sin señal con CSV y fotos, bandeja de gabinete con código SKT-TOP único, panel («Qué falta», perfil por capas y planta) que lee un resumen por frente, modelo 2D para gabinete (eje y secciones de Civil 3D en LandXML más la superficie de cada liberación), confirmación antes de las acciones importantes, rechazo con motivo, papelera, «no se libera» rápido desde el panel, versión de computadora con menú lateral, buscador Ctrl+K, clic derecho y acciones en grupo, ajustes, depuración de fotos de entregados antiguos (Ajustes → Archivos), aviso de tramos superpuestos, avance por capa en planta real con XML base y porcentaje por área, corrección de entregados con motivo, exportación a CSV y app instalable con logo.

## Instalar como app

- **Android (Chrome):** abrir la página y tocar «Instalar como app» en la pantalla de entrada o «Instalar» en la cabecera (también en el menú ⋮ → «Instalar app»).
- **iPhone (Safari):** botón Compartir → «Agregar a inicio».
- **Computadora (Chrome o Edge):** botón «Instalar» de la cabecera o el ícono de instalar en la barra de direcciones.

Ya instalada abre en su propia ventana, sin barra del navegador, y funciona sin señal. Mantener presionado el ícono muestra atajos (Nueva, Mis registros, Bandeja, Panel). El ícono muestra un número con lo pendiente (observados, bandeja y solicitudes de acceso, según el rol). Cuando se publica una versión nueva con la app abierta aparece «Hay una versión nueva · Actualizar». La app pide al teléfono no borrar lo guardado sin señal cuando falta espacio.

- `pruebas/`: pruebas automáticas con Firebase simulado y datos inventados (ver `pruebas/README.md`).
