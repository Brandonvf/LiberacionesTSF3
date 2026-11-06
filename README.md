# Liberaciones TSF3

Registro de liberaciones topográficas de la presa de relaves: los topógrafos registran en campo (también sin señal), gabinete genera los protocolos y los entrega a Calidad, y el jefe de área ve el avance.

- `index.html`: la app completa (Firebase Firestore + acceso con Google).
- `sw.js`: permite abrir la app sin señal.
- `firestore.rules`: reglas de seguridad. Se copian en Firebase → Firestore Database → Reglas → Publicar.

Incluye: acceso con Google y roles (operario, topógrafo, gabinete, jefe, administrador), registro en campo sin señal con CSV y fotos, bandeja de gabinete con código SKT-TOP único, panel («Qué falta», perfil por capas y planta) que lee un resumen por frente, ajustes y exportación a CSV.
