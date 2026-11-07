// Ayudas para las pruebas: manejar los filtros del panel (acordeón en computadora, hoja con «Aplicar» en celular)
const enHoja = async p => !!(await p.$('#pFilBtn'));
// Abre una sección del acordeón ('fil', 'pk' o 'cap') si está cerrada
async function seccion(p, k) {
  const h = await p.$(`[data-acc="${k}"]`);
  if (h && (await h.getAttribute('aria-expanded')) !== 'true') { await h.click(); await p.waitForTimeout(120); }
}
// Despliega las capas de un tipo dentro de «Capas»
async function grupo(p, tipo) {
  const g = await p.$(`[data-gx="${tipo}"]`);
  if (g && (await g.getAttribute('aria-expanded')) !== 'true') { await g.click(); await p.waitForTimeout(80); }
}
// Ejecuta fn con los filtros a la vista: en celular abre la hoja y al final toca «Aplicar»
async function filtros(p, fn) {
  const hoja = await enHoja(p);
  if (hoja) { await p.click('#pFilBtn'); await p.waitForSelector('.dlg-fil.on'); }
  await fn();
  if (hoja) { await p.click('.dlg-fil [type=submit]'); await p.waitForSelector('.dlg-fil', { state: 'detached' }); }
  await p.waitForTimeout(300);
}
// Escribe el rango de progresiva
async function rangoPk(p, a, b) {
  await filtros(p, async () => { await seccion(p, 'pk'); await p.fill('#pPk1', a); await p.press('#pPk1', 'Enter'); await seccion(p, 'pk'); await p.fill('#pPk2', b); await p.press('#pPk2', 'Enter'); });
}
module.exports = { seccion, grupo, filtros, rangoPk };
