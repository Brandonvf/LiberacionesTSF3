# Liberaciones TSF3

Registro de liberaciones topográficas de la presa de relaves: los topógrafos registran en campo (también sin señal), gabinete genera los protocolos y los entrega a Calidad, y el jefe de área ve el avance.

- `index.html`: la app completa (Firebase Firestore + acceso con Google).
- `sw.js`: permite abrir la app sin señal.
- `firestore.rules`: reglas de seguridad. Se copian en Firebase → Firestore Database → Reglas → Publicar.

Incluye: acceso con Google y roles, registro en campo sin señal con CSV y fotos, mis registros, ficha con historial, panel con perfil por capas y planta (eje por frente), y ajustes (usuarios, lugares con ejes, capas y tramos que no se liberan, topógrafos, tipos).
