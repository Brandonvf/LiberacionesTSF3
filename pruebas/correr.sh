#!/usr/bin/env bash
# Corre todas las pruebas de la app en un navegador real (Playwright) con Firebase simulado.
# Requisitos: Node.js y Playwright con Chromium (npm i -D playwright && npx playwright install chromium).
# Uso, desde la raíz del repositorio:  bash pruebas/correr.sh   (o una sola: bash pruebas/correr.sh prueba5)
cd "$(dirname "$0")/.."
python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 & SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1
FALLAS=0
for t in ${@:-prueba prueba2 prueba3 prueba4 prueba5 prueba6 prueba7 prueba8 prueba9 prueba10 prueba11 prueba12 prueba13 prueba14}; do
  echo "=== $t"
  salida=$(node "pruebas/$t.js" 2>&1); code=$?
  echo "$salida" | grep -E "^FALLA|Errores|Error|PAGEERROR" ; echo "$salida" | grep -c "^ok" | xargs -I{} echo "{} revisiones correctas"
  [ $code -ne 0 ] && FALLAS=$((FALLAS+1))
done
echo; [ $FALLAS -eq 0 ] && echo "Todas las pruebas pasaron." || { echo "$FALLAS prueba(s) con fallas."; exit 1; }
