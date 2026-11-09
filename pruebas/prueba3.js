const { chromium, devices } = require('playwright');
const path = require('path'), fs = require('fs');
const FAKE = path.join(__dirname, 'fake');
const OUT = path.join(__dirname, 'capturas', 'prueba3'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const JSONF = path.join(__dirname, 'datos', 'historico-prueba.json');
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  // Estas pruebas son de otros flujos: aceptan solas las confirmaciones (prueba8 prueba cancelar y aceptar)
  await ctx.addInitScript(() => { window.__autoConf = true; new MutationObserver(() => { const f = document.querySelector('.dlg.on form:has(.dlg-p)'); if (f && !f.dataset.auto) { f.dataset.auto = 1; setTimeout(() => f.querySelector('[type=submit]').click(), 30); } }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); });
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(FAKE, f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
}
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); await preparar(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errores.push(e.message); console.log('PAGEERROR', e.message); });
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errores.push(m.text()); });
  await page.goto(URL); await page.evaluate(() => { localStorage.clear(); localStorage.setItem('lib.panelVista', JSON.stringify('perfil')); });
  await page.evaluate(u => localStorage.setItem('__fakeUser', JSON.stringify(u)), ADMIN);
  await page.reload(); await page.waitForSelector('#nav button');
  ok((await page.textContent('#nav')).includes('Míos'), 'barra inferior con etiqueta corta');
  const navH = await page.$eval('.nav .wrap', n => n.getBoundingClientRect().height);
  ok(navH < 80, 'barra inferior de una sola línea (' + Math.round(navH) + ' px)');
  await page.click('[data-v="ajustes"]:not([hidden])'); await page.click('[data-tab="historico"]'); await page.waitForSelector('#hFile', { state: 'attached' });
  await page.setInputFiles('#hFile', JSONF);
  await page.waitForSelector('#hImp:not([disabled])');
  ok((await page.textContent('#hRes')).includes('2,669'), 'resumen del archivo: 2,669 registros');
  await page.screenshot({ path: OUT + '/01-historico.png', fullPage: true });
  await page.click('#hImp');
  await page.waitForFunction(() => /Listo/.test(document.querySelector('#hEst').textContent), null, { timeout: 60000 });
  ok(true, await page.textContent('#hEst'));
  const n = await page.evaluate(() => Object.keys(window.__fakeStore()).filter(k => k.startsWith('liberaciones/')).length);
  ok(n === 2669, 'registros en la base: ' + n);
  await page.screenshot({ path: OUT + '/02-historico-listo.png', fullPage: true });
  // reimportar no duplica
  await page.click('#hImp'); await page.waitForFunction(() => /Listo/.test(document.querySelector('#hEst').textContent));
  ok(await page.evaluate(() => Object.keys(window.__fakeStore()).filter(k => k.startsWith('liberaciones/')).length) === 2669, 'reimportar no duplica');
  // Panel con histórico
  await page.click('[data-v="panel"]'); await page.waitForSelector('#chart svg', { timeout: 20000 }); await page.waitForTimeout(800);
  const bandas = await page.$$eval('#chart .lab2', l => l.length);
  ok(bandas > 10, 'perfil Presa Principal Oeste con ' + bandas + ' bandas');
  await page.screenshot({ path: OUT + '/03-panel-historico-movil.png', fullPage: true });
  await page.click('[data-v="todos"]'); await page.waitForSelector('.item');
  ok((await page.textContent('.list')).includes('SKT-TOP-02684'), 'Registros muestra lo más reciente primero');
  // Lugares y capas en celular
  await page.click('[data-v="ajustes"]:not([hidden])'); await page.click('[data-tab="lugares"]'); await page.waitForSelector('.est');
  await page.screenshot({ path: OUT + '/04-lugares-movil.png' });
  await page.click('[data-tab="topografos"]'); await page.waitForSelector('#tpList');
  ok((await page.textContent('#tpList')).includes('CCH'), 'claves nuevas agregadas a topógrafos');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin desplazamiento horizontal');
  // Escritorio
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 } }); await preparar(ctx2);
  const p2 = await ctx2.newPage(); p2.on('pageerror', e => errores.push('2: ' + e.message));
  await p2.goto(URL);
  await p2.evaluate(s => localStorage.setItem('__fakeDB', s), await page.evaluate(() => localStorage.getItem('__fakeDB')));
  await p2.evaluate(u => localStorage.setItem('__fakeUser', JSON.stringify(u)), ADMIN);
  await p2.reload(); await p2.waitForSelector('#nav button');
  await p2.click('[data-v="panel"]'); await p2.waitForSelector('#chart svg'); await p2.waitForTimeout(900);
  await p2.screenshot({ path: OUT + '/05-perfil-historico-escritorio.png', fullPage: true });
  await p2.selectOption('#pSub', 'pan'); await p2.waitForTimeout(900);
  await p2.screenshot({ path: OUT + '/06-perfil-pan.png', fullPage: true });
  // Quitar importados
  await p2.click('[data-v="ajustes"]:not([hidden])'); await p2.click('[data-tab="historico"]'); await p2.click('#hBorrar'); await p2.click('#hBorrar');
  await p2.waitForFunction(() => !document.querySelector('#hBorrar').disabled && document.querySelector('#hBorrar').textContent.includes('Quitar'), null, { timeout: 30000 });
  ok(await p2.evaluate(() => Object.keys(window.__fakeStore()).filter(k => k.startsWith('liberaciones/')).length) === 0, 'quitar importados');
  console.log('Errores:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
