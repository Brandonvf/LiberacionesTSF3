// Prueba con el histórico real: progresiva inicial, filtro de capas, huecos y Ajustes → Capas
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'capturas', 'prueba4'); fs.mkdirSync(OUT, { recursive: true });
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  // Estas pruebas son de otros flujos: aceptan solas las confirmaciones (prueba8 prueba cancelar y aceptar)
  await ctx.addInitScript(() => { window.__autoConf = true; new MutationObserver(() => { const f = document.querySelector('.dlg.on form:has(.dlg-p)'); if (f && !f.dataset.auto) { f.dataset.auto = 1; setTimeout(() => f.querySelector('[type=submit]').click(), 30); } }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); });
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
}
async function cargar(p) {
  await p.goto('http://127.0.0.1:8765/');
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'datos', 'historico-prueba.json')));
  await p.evaluate(([d, u]) => { localStorage.clear(); const st = {}; d.registros.forEach(r => { const { id, ...x } = r; ['fechaCampo', 'fechaLiberacion', 'fechaEntrega'].forEach(k => { x[k] = x[k] ? { __ts: x[k] } : null; }); x.creadoEn = x.fechaCampo; x.origen = 'excel'; st['liberaciones/' + id] = x; }); localStorage.setItem('__fakeDB', JSON.stringify(st)); localStorage.setItem('__fakeUser', JSON.stringify(u)); }, [d, ADMIN]);
  await p.reload(); await p.waitForSelector('#nav button');
}
const ext = p => p.$$eval('#chart .pk-ext', t => t.map(x => x.textContent));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); await preparar(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', e => { errores.push(e.message); console.log('PAGEERROR', e.message); });
  await cargar(p);

  // 1. Progresiva inicial del frente 0+020
  await p.click('[data-v="ajustes"]'); await p.click('[data-tab="lugares"]'); await p.waitForSelector('.est');
  await p.fill('[data-e="0"] [data-s="0"] [data-k="smin"]', '0+020'); await p.press('[data-e="0"] [data-s="0"] [data-k="smin"]', 'Enter'); await p.waitForTimeout(200);
  await p.click('[data-v="panel"]'); await p.waitForSelector('#chart svg'); await p.waitForTimeout(400);
  const e1 = await ext(p);
  ok(e1[0] === 'PK 0+020', 'el eje empieza en el PK del frente: ' + e1.join(' → '));
  ok((await p.textContent('#pNota')).includes('fuera del rango del frente'), 'avisa registros fuera del rango');

  // 2. Rango visible
  await p.fill('#pPk1', '1800'); await p.press('#pPk1', 'Enter'); await p.fill('#pPk2', '2+200'); await p.press('#pPk2', 'Enter'); await p.waitForTimeout(300);
  ok((await ext(p)).join() === 'PK 1+800,PK 2+200', 'rango desde/hasta: ' + (await ext(p)).join(' → '));
  ok(await p.inputValue('#pPk1') === '1+800', 'el PK escrito se formatea');
  await p.click('#pPkX'); await p.waitForTimeout(200);
  ok((await ext(p))[0] === 'PK 0+020', 'volver a todo el frente');

  // 3. Capas visibles
  if (!(await p.$eval('#pCapSel', d => d.open))) await p.click('#pCapSel summary');
  const total = await p.$$eval('#pCapChips .cchip', c => c.length);
  await p.click('[data-cap="ninguna"]'); await p.waitForTimeout(200);
  ok((await p.textContent('#chart')).includes('Todas las capas están ocultas'), 'ninguna capa → aviso');
  await p.click('[data-cap="ultimas"]'); await p.waitForTimeout(300);
  const nU = await p.$$eval('#chart .lab-hit', l => l.length);
  ok(nU > 0 && nU < total, 'últimas 5 por tipo: ' + nU + ' bandas de ' + total + ' capas');
  await p.click('[data-cap="todas"]'); await p.waitForTimeout(300);
  const nT = await p.$$eval('#chart .lab-hit', l => l.length);
  await p.click('#pCapChips [data-key="masivo|Capa 15"]'); await p.waitForTimeout(250);
  ok(await p.$$eval('#chart .lab-hit', l => l.length) === nT - 1, 'apagar una ficha quita su banda');
  await p.$eval('#chart .lab-hit', g => g.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(250);
  ok(await p.$$eval('#chart .lab-hit', l => l.length) === nT - 2, 'tocar el nombre en el gráfico oculta la capa');
  await p.reload(); await p.waitForSelector('#nav button'); await p.click('[data-v="panel"]'); await p.waitForSelector('#chart svg'); await p.waitForTimeout(300);
  ok(await p.$$eval('#chart .lab-hit', l => l.length) === nT - 2, 'la selección se recuerda al volver');
  await p.click('[data-cap="todas"]'); await p.waitForTimeout(300);

  // 4. Huecos y tabla «Qué falta»
  const nH = await p.$$eval('#chart rect.hueco', r => r.length);
  ok(nH > 0, nH + ' huecos marcados como falta liberar');
  const anchoMin = await p.$$eval('#chart rect.hueco', r => Math.min(...r.map(x => +x.getAttribute('width'))));
  ok(anchoMin >= 4, 'hasta el hueco más chico se ve (ancho ' + anchoMin + ' px)');
  ok(await p.$$eval('#pFalta tr.ftg', r => r.length) > 5, 'tabla «Qué falta» con capas');
  await p.click('#pFalta tr[data-gap] >> nth=0'); await p.waitForSelector('#ctx .ctx-i'); await p.click('#ctx .ctx-i:has-text("Ver en el dibujo")'); await p.waitForTimeout(300);
  ok(!(await p.$eval('#pInfo', i => i.hidden)) && (await p.textContent('#pInfo')).includes('Falta liberar'), 'tocar un tramo de la tabla lo marca en el gráfico');
  await p.screenshot({ path: OUT + '/01-panel-escritorio.png', fullPage: true });
  await p.fill('#pPk1', '1+700'); await p.press('#pPk1', 'Enter'); await p.fill('#pPk2', '2+300'); await p.press('#pPk2', 'Enter'); await p.waitForTimeout(500);
  await p.locator('.chartbox').screenshot({ path: OUT + '/02-perfil-rango.png' });
  await p.locator('#pFalta').screenshot({ path: OUT + '/03-que-falta.png' });

  // 5. Ajustes → Capas
  await p.click('[data-v="ajustes"]'); await p.click('[data-tab="capas"]'); await p.waitForSelector('#cSub');
  await p.selectOption('#cSub', 'pp-oeste'); await p.selectOption('#cTipo', 'masivo');
  await p.click('#cDesdeReg'); await p.waitForSelector('.ct-row[data-i]', { timeout: 20000 });
  const nCap = await p.$$eval('.ct-row[data-i]', r => r.length);
  ok(nCap >= 20, 'crear desde los registros: ' + nCap + ' capas');
  await p.fill('#cQ', '3'); await p.waitForTimeout(150);
  const nQ = await p.$$eval('.ct-row[data-i]', r => r.length);
  ok(nQ > 0 && nQ < nCap, 'buscador filtra (' + nQ + ')');
  await p.fill('#cQ', ''); await p.waitForTimeout(150);
  for (const k of [0, 1, 2]) await p.click(`.ct-row[data-i="${k}"] [data-k="sel"]`);
  ok((await p.textContent('.cap-bulk')).includes('3 seleccionadas'), 'selección múltiple');
  await p.click('[data-bulk="ocultar"]'); await p.waitForTimeout(150);
  ok(await p.$$eval('.ct-row.oc', r => r.length) === 3, 'ocultar 3 en el gráfico');
  await p.click('[data-bulk="cotas"]'); await p.fill('#cS0', '758.00'); await p.fill('#cSd', '0.30'); await p.click('#cSOk'); await p.waitForTimeout(150);
  const cotas = await p.$$eval('.ct-row[data-i] [data-k="cota"]', i => i.slice(0, 3).map(x => x.value));
  ok(cotas.join() === '758.00,758.30,758.60', 'cotas en serie: ' + cotas.join(', '));
  await p.click('[data-bulk="limpiar"]');
  await p.screenshot({ path: OUT + '/04-ajustes-capas.png', fullPage: true });
  await p.fill('#cDe', '30'); await p.fill('#cA', '40'); await p.click('#cQuitarR'); await p.click('#cQuitarR'); await p.waitForTimeout(150);
  const nR = await p.$$eval('.ct-row[data-i]', r => r.length);
  ok(nR < nCap, 'quitar rango 30 a 40: quedan ' + nR);
  await p.fill('#cDe', '50'); await p.fill('#cA', '52'); await p.click('#cVarias'); await p.waitForTimeout(150);
  ok(await p.$$eval('.ct-row[data-i]', r => r.length) === nR + 3, 'agregar rango 50 a 52');
  // Panel respeta las ocultas por defecto
  await p.click('[data-v="panel"]'); await p.waitForSelector('#chart svg'); await p.waitForTimeout(300);
  await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('lib.vis.')) localStorage.removeItem(k); });
  await p.click('#pSub'); await p.selectOption('#pSub', 'pp-este'); await p.waitForTimeout(200); await p.selectOption('#pSub', 'pp-oeste'); await p.waitForTimeout(400);
  const off = await p.$$eval('#pCapChips .cchip[aria-pressed="false"]', c => c.length);
  ok(off === 3, 'las 3 capas ocultas en Ajustes empiezan apagadas en el panel (' + off + ')');

  // 6. Celular
  const ctx2 = await b.newContext({ ...devices['iPhone 13'] }); await preparar(ctx2);
  const m = await ctx2.newPage(); m.on('pageerror', e => errores.push('m: ' + e.message));
  await m.goto('http://127.0.0.1:8765/');
  await m.evaluate(([s, u]) => { localStorage.setItem('__fakeDB', s); localStorage.setItem('__fakeUser', JSON.stringify(u)); }, [await p.evaluate(() => localStorage.getItem('__fakeDB')), ADMIN]);
  await m.reload(); await m.waitForSelector('#nav button'); await m.click('[data-v="panel"]'); await m.waitForSelector('#chart svg');
  await m.click('#pCapSel summary'); await m.click('[data-cap="ultimas"]'); await m.fill('#pPk1', '1+800'); await m.press('#pPk1', 'Enter'); await m.fill('#pPk2', '2+300'); await m.press('#pPk2', 'Enter'); await m.waitForTimeout(800);
  await m.screenshot({ path: OUT + '/05-panel-movil.png', fullPage: true });
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'celular sin desplazamiento horizontal');
  await m.click('[data-v="ajustes"]'); await m.click('[data-tab="capas"]'); await m.waitForSelector('#cSub'); await m.selectOption('#cSub', 'pp-oeste'); await m.selectOption('#cTipo', 'masivo'); await m.waitForTimeout(200);
  await m.click('.ct-row[data-i="0"] [data-k="sel"]');
  await m.screenshot({ path: OUT + '/06-capas-movil.png', fullPage: true });
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Ajustes → Capas sin desplazamiento horizontal');
  console.log('Errores:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
