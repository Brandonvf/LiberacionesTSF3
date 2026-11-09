// Repaso: resumen por frente, «Qué falta» en celular, registrar desde un faltante, siguiente tramo, capa pareja, atrás
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const { seccion, grupo, filtros, rangoPk, tipo, equipo } = require('./filtros');
const OUT = path.join(__dirname, 'capturas', 'prueba7'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const OPER = { uid: 'o1', email: 'operario@gmail.com', displayName: 'Pedro Operario' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  // Estas pruebas son de otros flujos: aceptan solas las confirmaciones (prueba8 prueba cancelar y aceptar)
  await ctx.addInitScript(() => { window.__autoConf = true; new MutationObserver(() => { const f = document.querySelector('.dlg.on form:has(.dlg-p)'); if (f && !f.dataset.auto) { f.dataset.auto = 1; setTimeout(() => f.querySelector('[type=submit]').click(), 30); } }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); });
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
}
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); await preparar(ctx);
  const p = await ctx.newPage(); p.on('pageerror', e => { errores.push(e.message); console.log('PAGEERROR', e.message); });
  await p.goto(URL);
  // Histórico cargado directo en la base simulada, sin resumen todavía
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'datos', 'historico-prueba.json')));
  await p.evaluate(([d, u]) => { localStorage.clear(); const st = {}; d.registros.forEach(r => { const { id, ...x } = r; ['fechaCampo', 'fechaLiberacion', 'fechaEntrega'].forEach(k => { x[k] = x[k] ? { __ts: x[k] } : null; }); x.creadoEn = x.fechaCampo; x.origen = 'excel'; st['liberaciones/' + id] = x; });
    st['usuarios/operario@gmail.com'] = { nombre: 'Pedro Operario', rol: 'operario', topografoId: 'GN', activo: true };
    localStorage.setItem('__fakeDB', JSON.stringify(st)); localStorage.setItem('__fakeUser', JSON.stringify(u)); }, [d, ADMIN]);
  await p.reload(); await p.waitForSelector('#nav button');
  await p.waitForFunction(() => Object.keys(window.__fakeStore()).some(k => k.startsWith('resumen/')), null, { timeout: 20000 });
  const res = await p.evaluate(() => { const s = window.__fakeStore(); const r = Object.keys(s).filter(k => k.startsWith('resumen/')); return { docs: r.length, oeste: Object.keys(s['resumen/pp-oeste'].r).length, kb: Math.round(JSON.stringify(s['resumen/pp-oeste']).length / 1024) }; });
  ok(res.docs >= 10 && res.oeste > 800, `el administrador prepara el resumen solo: ${res.docs} frentes, Oeste con ${res.oeste} registros en ${res.kb} KB`);
  ok((await p.evaluate(() => window.__fakeStore()['config/general'].resumenV)) === 1, 'queda marcado para no repetirlo');
  await p.click('#btnSalir'); await p.waitForSelector('#gEntrar');

  // Operario en celular: el panel abre en «Qué falta»
  await p.evaluate(u => { window.__fakeLogin = u; }, OPER); await p.click('#gEntrar'); await p.waitForSelector('#nav button');
  await p.click('[data-v="panel"]'); await p.waitForSelector('.qflist', { timeout: 15000 });
  ok(await p.$eval('[data-vista="lista"]', b => b.getAttribute('aria-pressed')) === 'true', 'en celular el panel abre en «Qué falta»');
  const nCards = await p.$$eval('.qf', c => c.length);
  ok(nCards > 5, `${nCards} capas con faltantes listadas`);
  ok((await p.textContent('.qf-res')).includes('Falta liberar'), 'resumen arriba: metros que faltan');
  await rangoPk(p, '1+800', '2+300');
  await p.screenshot({ path: OUT + '/01-que-falta-movil.png', fullPage: true });
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin desplazamiento horizontal');
  // Ver completas
  if (await p.$('#qfComp')) { const a = await p.$$eval('.qf', c => c.length); await p.click('#qfComp'); await p.waitForTimeout(150); ok(await p.$$eval('.qf', c => c.length) > a, 'ver también las capas completas'); await p.click('#qfComp'); }
  // Tocar un faltante → registrar con datos llenos
  const card = p.locator('.qf:has(.t:text("Relleno masivo"))').first();
  const capa = (await card.locator('b').first().textContent()).split(' · ')[0];
  await card.locator('[data-falta]').first().click(); await p.waitForSelector('.dlg.on');
  ok((await p.textContent('.dlg')).includes('Falta liberar'), 'tocar un faltante muestra el detalle');
  await p.screenshot({ path: OUT + '/02-faltante.png' });
  await p.click('.dlg button[type=submit]'); await p.waitForSelector('#fLib:not([hidden])');
  ok(await p.inputValue('#iSub') === 'pp-oeste' && await p.inputValue('#fLib [name="tipoId"]') === 'masivo' && await p.inputValue('#iCapa') === capa, `«Nueva» queda llena: Presa Principal Oeste · Relleno masivo · ${capa}`);
  const pk1 = await p.inputValue('#iPk1'), pk2 = await p.inputValue('#iPk2');
  ok(/^\d\+\d{3}/.test(pk1) && /^\d\+\d{3}/.test(pk2), `PK del faltante: ${pk1} – ${pk2}`);
  await p.screenshot({ path: OUT + '/03-nueva-llena.png', fullPage: true });
  // Ajustar el tramo (solo 40 m) y guardar
  await p.fill('#iPk1', '2+100'); await p.fill('#iPk2', '2+140'); await p.fill('#iCapa', 'capa 31'); await p.locator('#iCapa').blur();
  ok(await p.inputValue('#iCapa') === 'Capa 31', '«capa 31» se escribe como «Capa 31»');
  await equipo(p); await p.click('#bGuardar'); await p.waitForTimeout(200);
  ok((await p.textContent('#bGuardar')).includes('Guardado'), 'el botón confirma «Guardado ✓» y evita el doble toque');
  // Siguiente tramo
  await p.waitForSelector('#bSig');
  ok((await p.textContent('#bSig')).includes('2+140 – 2+180'), 'aparece «Siguiente tramo 2+140 – 2+180»');
  await p.click('#bSig');
  ok(await p.inputValue('#iPk1') === '2+140' && await p.inputValue('#iPk2') === '2+180' && await p.inputValue('#iCapa') === 'Capa 31', 'siguiente tramo llena PK y capa');
  await p.fill('#iDesc', 'Relleno masivo capa 31 tramo siguiente'); await p.click('#bGuardar'); await p.waitForTimeout(300);
  await p.fill('#iPk1', '2+180'); await p.fill('#iPk2', '2+220'); await tipo(p, 'masivo'); await p.fill('#iCapa', '31'); await p.fill('#iDesc', 'tercer tramo'); await p.waitForTimeout(800); await p.click('#bGuardar'); await p.waitForTimeout(300);
  const mis = await p.evaluate(() => Object.values(window.__fakeStore()).filter(x => x.creadoPor === 'operario@gmail.com').map(x => x.capa));
  ok(mis.length === 3 && mis.every(c => c === 'Capa 31'), `3 registros seguidos guardados, todos «Capa 31» (${mis.join(', ')})`);
  // El resumen se actualizó con lo nuevo
  const enRes = await p.evaluate(() => Object.values(window.__fakeStore()['resumen/pp-oeste'].r).filter(a => a[1] === 'Capa 31' && a[4] === 'PT').length);
  ok(enRes === 3, 'el resumen del frente incluye los 3 nuevos al instante');
  await p.click('[data-v="panel"]'); await p.waitForSelector('.qflist');
  ok((await p.textContent('.qflist')).includes('Capa 31'), 'la capa nueva aparece en «Qué falta»');
  // Lista del panel: abrir ficha completa desde el resumen
  await p.click('[data-vista="perfil"]'); await p.waitForSelector('#chart .ojo');
  await p.click('#pLista .pfila >> nth=0'); await p.waitForSelector('#sheet.on');
  ok((await p.textContent('#sheet')).includes('Historial'), 'tocar una fila del panel abre la ficha completa');
  // Atrás cierra la ficha y luego vuelve a la pantalla anterior
  await p.goBack(); await p.waitForTimeout(400);
  ok(await p.$eval('#sheet', s => s.hidden), '«atrás» cierra la ficha');
  ok(await p.$eval('[data-v="panel"]', b => b.getAttribute('aria-current')) === 'page', 'y se queda en el panel');
  await p.goBack(); await p.waitForTimeout(300);
  ok(await p.$eval('[data-v="nueva"]', b => b.getAttribute('aria-current')) === 'page', 'otro «atrás» vuelve a Nueva');
  await p.click('#btnSalir'); await p.waitForSelector('#gEntrar');

  // Gabinete: acepta lo nuevo; «Por entregar» no carga el histórico hasta pedirlo
  await p.evaluate(u => { window.__fakeLogin = u; }, ADMIN); await p.click('#gEntrar'); await p.waitForSelector('#nav button');
  await p.click('[data-v="bandeja"]'); await p.waitForSelector('.brow');
  ok(await p.$$eval('.brow', r => r.length) === 3, 'bandeja con los 3 nuevos');
  await p.click('#bAll2'); await p.click('[data-bk="aceptar"]'); await p.waitForTimeout(600);
  const r3 = await p.evaluate(() => Object.values(window.__fakeStore()['resumen/pp-oeste'].r).filter(a => a[1] === 'Capa 31').map(a => a[4] + ' ' + a[6]).sort());
  ok(r3.every(x => x.startsWith('EP SKT-TOP-0269')), 'el resumen recibe el código y el estado al aceptar: ' + r3.join(', '));
  await p.click('[data-bt="EP"]'); await p.waitForSelector('.brow');
  ok(await p.$$eval('.brow', r => r.length) === 3, '«Por entregar» muestra solo lo de la app (3), no las 727 del histórico');
  await p.click('#bHist'); await p.waitForFunction(() => document.querySelectorAll('.brow').length >= 60, null, { timeout: 15000 });
  ok((await p.textContent('.tabs')).match(/Por entregar\s*(\d+)/)[1] > 700, 'el histórico se carga solo al pedirlo');
  await p.screenshot({ path: OUT + '/04-bandeja.png' });
  // Copiar código desde la ficha
  await p.click('[data-bt="EP"]'); await p.click('.brow .item >> nth=0'); await p.waitForSelector('#fCopiar');
  ok(true, 'la ficha tiene botón «Copiar» junto al código');
  // Escritorio: perfil
  const ctx2 = await b.newContext({ viewport: { width: 1366, height: 900 } }); await preparar(ctx2);
  const p2 = await ctx2.newPage(); p2.on('pageerror', e => errores.push('2: ' + e.message));
  await p2.goto(URL); await p2.evaluate(([s, u]) => { localStorage.setItem('__fakeDB', s); localStorage.setItem('__fakeUser', JSON.stringify(u)); }, [await p.evaluate(() => localStorage.getItem('__fakeDB')), ADMIN]);
  await p2.reload(); await p2.waitForSelector('#nav button'); await p2.click('[data-v="panel"]'); await p2.waitForSelector('#chart svg');
  ok(await p2.$eval('[data-vista="perfil"]', b => b.getAttribute('aria-pressed')) === 'true', 'en computadora abre en el perfil');
  await p2.click('[data-vista="lista"]'); await p2.waitForSelector('.qflist'); await p2.waitForTimeout(300);
  await p2.screenshot({ path: OUT + '/05-que-falta-escritorio.png' });
  console.log('Errores:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
