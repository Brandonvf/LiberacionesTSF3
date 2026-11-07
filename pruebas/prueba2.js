const { chromium, devices } = require('playwright');
const path = require('path'), fs = require('fs');
const FAKE = path.join(__dirname, 'fake');
const OUT = path.join(__dirname, 'capturas', 'prueba2'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  // Estas pruebas son de otros flujos: aceptan solas las confirmaciones (prueba8 prueba cancelar y aceptar)
  await ctx.addInitScript(() => { window.__autoConf = true; new MutationObserver(() => { const f = document.querySelector('.dlg.on form:has(.dlg-p)'); if (f && !f.dataset.auto) { f.dataset.auto = 1; setTimeout(() => f.querySelector('[type=submit]').click(), 30); } }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); });
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(FAKE, f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
}
const csv = 'P1,8495120.123,465320.456,769.63,STN\n' + Array.from({ length: 120 }, (_, i) => `P${i + 2},8495${120 + i}.1,4653${20 + i}.4,76${i % 10}.2,FIL2`).join('\n');
const foto = fs.readFileSync(path.join(__dirname, 'datos', 'foto-prueba.png'));

async function registrar(page, o) {
  await page.click('[data-v="nueva"]'); await page.waitForSelector('#fLib:not([hidden])');
  await page.selectOption('#iTopo', o.topo || 'AB');
  await page.selectOption('#iEst', o.est || 'pp'); await page.selectOption('#iSub', o.sub || 'pp-oeste');
  await page.selectOption('#iEle', 'mt'); await page.selectOption('#iTipo', o.tipo);
  await page.fill('#iPk1', o.a); await page.fill('#iPk2', o.b);
  await page.fill('#iCapa', o.capa || '');
  await page.fill('#iDesc', o.d || 'Liberación ' + o.tipo + ' ' + o.a);
  if (o.archivos) {
    await page.setInputFiles('#fCsv', { name: 'levantamiento.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.waitForSelector('.arch');
    await page.setInputFiles('#fFoto', { name: 'IMG_0001.png', mimeType: 'image/png', buffer: foto });
    await page.waitForFunction(() => document.querySelectorAll('.arch').length === 2);
  }
  await page.click('#bGuardar'); await page.waitForTimeout(150);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await preparar(ctx);
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errores.push(m.text()); });
  page.on('pageerror', e => { errores.push('pageerror: ' + e.message); console.log('PAGEERROR', e.message, e.stack.split('\n')[1]); });
  await page.goto(URL); await page.evaluate(() => { localStorage.clear(); localStorage.setItem('lib.panelVista', JSON.stringify('perfil')); }); await page.reload();
  await page.waitForSelector('#gEntrar');
  await page.evaluate(u => { window.__fakeLogin = u; }, ADMIN); await page.click('#gEntrar');
  await page.waitForSelector('#nav button');
  const navs = await page.$$eval('#nav button', bs => bs.map(b => b.dataset.v));
  ok(navs.join() === 'nueva,mis,bandeja,todos,panel,ajustes', 'admin: ' + navs.join());

  // Archivos
  await page.click('[data-v="nueva"]'); await page.waitForSelector('#fLib:not([hidden])');
  await page.setInputFiles('#fCsv', { name: 'levantamiento.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.setInputFiles('#fFoto', { name: 'IMG_0001.png', mimeType: 'image/png', buffer: foto });
  await page.waitForFunction(() => document.querySelectorAll('.arch').length === 2);
  ok((await page.textContent('.archs')).includes('121 líneas'), 'CSV leído con 121 líneas');
  ok(await page.$eval('.arch img', i => i.src.startsWith('data:image/jpeg')), 'foto comprimida a JPEG');
  await page.locator('.archs').scrollIntoViewIfNeeded();
  await page.screenshot({ path: OUT + '/01-archivos.png' });
  await page.click('#bLimpiar');

  await registrar(page, { tipo: 'filtro2', a: '2+627', b: '2+642', archivos: true, d: 'Liberación de relleno filtro 2 con archivos' });
  await registrar(page, { tipo: 'stn', a: '2+100', b: '2+140' });
  await registrar(page, { tipo: 'stn', a: '2+140', b: '2+180' });
  await registrar(page, { tipo: 'zanja', a: '2+100', b: '2+180' });
  await registrar(page, { tipo: 'masivo', a: '1+864.5', b: '1+921', capa: 'Capa 15' });
  await registrar(page, { tipo: 'masivo', a: '1+880', b: '1+990', capa: 'Capa 16' });
  await registrar(page, { tipo: 'masivo', a: '1+900', b: '2+050', capa: 'Capa 17' });
  // cambiar estados a mano en el simulador para ver colores
  await page.evaluate(() => { const s = window.__fakeStore(); const ks = Object.keys(s).filter(k => k.startsWith('liberaciones/')); ks.forEach((k, i) => { s[k].estado = ['EC', 'EP', 'PT', 'EC', 'OB', 'EC', 'EP'][i % 7]; }); localStorage.setItem('__fakeDB', JSON.stringify(s)); });

  // Ficha con archivos
  await page.click('[data-v="mis"]'); await page.waitForSelector('.item');
  ok((await page.textContent('.list')).includes('1 CSV · 1 foto'), 'tarjeta resume archivos');
  await page.click('.item:has-text("con archivos")'); await page.waitForSelector('#sheet.on');
  await page.waitForSelector('#fArch img');
  ok(true, 'ficha muestra miniatura de la foto');
  await page.locator('#fArch').scrollIntoViewIfNeeded();
  await page.screenshot({ path: OUT + '/02-ficha-archivos.png' });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#fArch [data-arch]:has-text("CSV")')]);
  ok(dl.suggestedFilename() === 'levantamiento.csv', 'descarga el CSV');
  await page.click('#fArch [data-arch]:has-text("JPG"), #fArch [data-arch]:has(img)');
  await page.waitForSelector('.lb.on img'); await page.screenshot({ path: OUT + '/03-foto.png' });
  await page.click('.lb [data-x]'); await page.waitForTimeout(300);
  await page.click('#fCerrar'); await page.waitForTimeout(350);

  // Panel
  await page.reload(); await page.waitForSelector('#nav button');
  await page.click('[data-v="panel"]'); await page.waitForSelector('#chart svg');
  await page.waitForTimeout(700);
  const filas = await page.$$eval('#chart .lab2', l => l.map(x => x.querySelector('title').textContent.replace(' · toca para ocultar', '')));
  ok(filas.length === 6, 'perfil con 6 bandas: ' + filas.join(' | '));
  ok(filas[filas.length - 1].startsWith('Superficie') && filas.includes('Relleno masivo · Capa 15') && filas.indexOf('Relleno masivo · Capa 17') < filas.indexOf('Relleno masivo · Capa 15'), 'capas apiladas de abajo hacia arriba');
  ok(await page.$$eval('#chart rect.seg', r => r.length) === 7, '7 tramos dibujados');
  await page.check('#pZoom'); await page.waitForTimeout(700);
  await page.screenshot({ path: OUT + '/04-panel-movil.png', fullPage: true });
  ok(await page.$eval('#chart .tick', t => t.textContent) !== '0+000', 'acercar cambia el eje');
  await page.click('[data-vista="planta"]'); await page.waitForSelector('#chart .empty');
  ok((await page.textContent('#chart')).includes('Falta el eje'), 'planta sin eje pide subirlo');
  await page.click('#irEjes'); await page.waitForSelector('[data-eje="pp-oeste"]', { state: 'attached' });
  const eje = 'PK,Este,Norte\n' + Array.from({ length: 28 }, (_, i) => { const pk = i * 100; const a = i / 27 * Math.PI * 0.9; return `${pk},${(468000 + 1200 * Math.cos(a)).toFixed(3)},${(8394000 + 900 * Math.sin(a)).toFixed(3)}`; }).join('\n');
  await page.setInputFiles('[data-eje="pp-oeste"]', { name: 'eje_oeste.csv', mimeType: 'text/csv', buffer: Buffer.from(eje) });
  await page.waitForTimeout(300);
  ok((await page.textContent('[data-eje="pp-oeste"] >> xpath=..')).includes('28 pts'), 'eje cargado (28 puntos)');
  const eje2 = '8393500.0 467000.0 P1\n8393600 467050 P2\n8393750 467080 P3\n8393900 467070 P4';
  await page.setInputFiles('[data-eje="pp-este"]', { name: 'eje_este.txt', mimeType: 'text/plain', buffer: Buffer.from(eje2) });
  await page.waitForTimeout(300);
  ok((await page.textContent('[data-eje="pp-este"] >> xpath=..')).includes('4 pts'), 'eje sin PK (Norte Este) se calcula solo');
  await page.screenshot({ path: OUT + '/09-lugares-ejes.png', fullPage: true });
  await page.click('[data-v="panel"]'); await page.waitForSelector('#chart svg');
  await page.selectOption('#pTipoPl', 'masivo'); await page.waitForTimeout(400);
  ok(await page.$$eval('#chart path.tramo', r => r.length) === 3, 'planta dibuja 3 tramos de relleno masivo');
  await page.screenshot({ path: OUT + '/10-planta-movil.png', fullPage: true });
  await page.$eval('#chart path.tramo', p => p.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await page.waitForSelector('#sheet.on'); ok(true, 'tocar tramo en planta abre ficha');
  await page.click('#fCerrar'); await page.waitForTimeout(350);
  await page.click('[data-v="ajustes"]'); await page.click('[data-tab="capas"]'); await page.waitForSelector('#cSub');
  await page.selectOption('#cSub', 'pp-oeste'); await page.selectOption('#cTipo', 'masivo');
  await page.fill('#cDe', '15'); await page.fill('#cA', '20'); await page.click('#cVarias'); await page.waitForTimeout(200);
  ok(await page.$$eval('#cCapas .ct-row[data-i]', r => r.length) === 6, 'capas 15 a 20 agregadas');
  await page.fill('#cCapas [data-i="5"] [data-k="cota"]', '765.20'); await page.press('#cCapas [data-i="5"] [data-k="cota"]', 'Enter');
  await page.selectOption('#nCapa', 'Capa 18'); await page.fill('#nPki', '1+950'); await page.fill('#nPkf', '2+050'); await page.fill('#nNota', 'Zona de roca'); await page.click('#nAdd'); await page.waitForTimeout(200);
  await page.fill('#nPki', '2+300'); await page.fill('#nPkf', '2+400'); await page.click('#nAdd'); await page.waitForTimeout(200);
  ok(await page.$$eval('#cNa .nrow[data-i]', r => r.length) === 2, 'dos tramos que no se liberan');
  await page.click('#cCapas [data-i="0"] [data-k="del"]'); await page.waitForTimeout(150);
  ok(await page.$$eval('#cCapas .ct-row[data-i]', r => r.length) === 5, 'quitar capa');
  await page.screenshot({ path: OUT + '/12-ajustes-capas.png', fullPage: true });
  await page.click('[data-v="nueva"]'); await page.waitForSelector('#fLib:not([hidden])');
  await page.selectOption('#iEst', 'pp'); await page.selectOption('#iSub', 'pp-oeste'); await page.selectOption('#iEle', 'mt'); await page.selectOption('#iTipo', 'masivo');
  ok(await page.$$eval('#dlCapas option', o => o.length) === 5, 'formulario sugiere las capas del frente');
  await page.click('#bLimpiar');
  await page.click('[data-v="panel"]'); await page.waitForSelector('#chart svg');
  await page.click('[data-vista="perfil"]'); await page.waitForSelector('#chart svg'); await page.waitForTimeout(500);
  const bandas = await page.$$eval('#chart .lab2', l => l.map(x => x.querySelector('title').textContent.replace(' · toca para ocultar', '')));
  ok(bandas.includes('Relleno masivo · Capa 20 (cota 765.20)') && bandas.includes('Relleno masivo · Capa 15'), 'perfil muestra capas definidas y su cota');
  ok(await page.$$eval('#chart rect.nolib', r => r.length) >= 6, 'tramos que no se liberan dibujados');
  await page.screenshot({ path: OUT + '/13-perfil-capas.png', fullPage: true });
  await page.click('[data-vista="perfil"]'); await page.waitForSelector('#chart svg');
  if (!(await page.$eval('#pCapSel', d => d.open))) await page.click('#pCapSel summary');
  await page.click('#pCapSel [data-cap="ninguna"]'); await page.waitForTimeout(150);
  await page.click('#pCapChips [data-key="masivo|Capa 16"]'); await page.waitForTimeout(300);
  ok(await page.$$eval('#chart rect.seg', r => r.length) === 1, 'filtro de capa');
  await page.click('#pCapSel [data-cap="todas"]'); await page.waitForTimeout(300);
  await page.click('#chart rect.seg >> nth=0'); await page.waitForSelector('#sheet.on'); ok(true, 'tocar tramo abre la ficha');
  await page.click('#fCerrar'); await page.waitForTimeout(350);

  // Ajustes: lugares
  await page.click('[data-v="ajustes"]'); await page.waitForSelector('.tabs');
  await page.click('[data-tab="lugares"]'); await page.waitForSelector('.est');
  await page.fill('[data-e="1"] [data-k="snew"]', 'Presa Auxiliar Norte Este');
  await page.click('[data-e="1"] [data-k="sadd"]');
  await page.fill('#eNew', 'Presa Auxiliar Sur'); await page.click('#eAdd');
  await page.fill('[data-e="0"] [data-s="0"] [data-k="smax"]', '2+750'); await page.press('[data-e="0"] [data-s="0"] [data-k="smax"]', 'Enter');
  await page.screenshot({ path: OUT + '/05-lugares.png' });
  await page.waitForTimeout(250);
  await page.click('[data-v="nueva"]'); await page.waitForSelector('#fLib:not([hidden])');
  await page.selectOption('#iEst', 'pan');
  ok((await page.$$eval('#iSub option', o => o.map(x => x.textContent))).includes('Presa Auxiliar Norte Este'), 'nueva sub-estructura enlazada a su estructura en el formulario');
  ok(await page.$$eval('#iSub option', o => o.length) === 3, 'sin duplicados al agregar');
  ok((await page.$$eval('#iEst option', o => o.map(x => x.textContent))).includes('Presa Auxiliar Sur'), 'nueva estructura en el formulario');
  await page.selectOption('#iEst', { label: 'Presa Auxiliar Sur' });
  ok((await page.inputValue('#iSub')) !== '', 'estructura nueva con su sub-estructura');
  await page.click('#bLimpiar');

  // Ajustes: topógrafos
  await page.click('[data-v="ajustes"]'); await page.click('[data-tab="topografos"]'); await page.waitForSelector('#tpList');
  await page.fill('#tpId', 'hq'); await page.fill('#tpNom', 'Hugo Quispe'); await page.click('#tpAdd');
  await page.fill('#tpList [data-i="1"] [data-k="nom"]', 'Gregorio Navarro Huaraca'); await page.press('#tpList [data-i="1"] [data-k="nom"]', 'Enter');
  await page.screenshot({ path: OUT + '/06-topografos.png' });
  await page.waitForTimeout(250);
  await page.click('[data-v="nueva"]'); await page.waitForSelector('#fLib:not([hidden])');
  const topos = await page.$$eval('#iTopo option', o => o.map(x => x.textContent));
  ok(topos.includes('Hugo Quispe') && topos.includes('Gregorio Navarro Huaraca'), 'topógrafo nuevo y nombre corregido');

  // Ajustes: tipos (ordenar) y descarte
  await page.click('[data-v="ajustes"]'); await page.click('[data-tab="tipos"]'); await page.waitForSelector('#tyList');
  await page.click('#tyList [data-i="1"] [data-k="up"]');
  ok((await page.inputValue('#tyList [data-i="0"] [data-k="nom"]')) === 'Superficie de terreno nivelado', 'subir tipo cambia el orden');
  await page.screenshot({ path: OUT + '/07-tipos.png' });
  await page.reload(); await page.waitForSelector('#nav button'); await page.click('[data-v="ajustes"]'); await page.click('[data-tab="tipos"]'); await page.waitForSelector('#tyList');
  ok((await page.inputValue('#tyList [data-i="0"] [data-k="nom"]')) === 'Superficie de terreno nivelado', 'el orden se guardó solo');

  // Escritorio
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 } }); await preparar(ctx2);
  const p2 = await ctx2.newPage(); p2.on('pageerror', e => errores.push('pageerror2: ' + e.message));
  await p2.goto(URL);
  await p2.evaluate(s => localStorage.setItem('__fakeDB', s), await page.evaluate(() => localStorage.getItem('__fakeDB')));
  await p2.evaluate(u => localStorage.setItem('__fakeUser', JSON.stringify(u)), ADMIN);
  await p2.reload(); await p2.waitForSelector('#nav button');
  await p2.click('[data-v="panel"]'); await p2.waitForSelector('#chart svg'); await p2.waitForTimeout(800);
  await p2.screenshot({ path: OUT + '/11-perfil-escritorio.png' });
  await p2.hover('#chart rect.seg >> nth=2'); await p2.waitForTimeout(200);
  ok(await p2.$eval('.tip', t => t.classList.contains('on')), 'tooltip al pasar el cursor');
  await p2.screenshot({ path: OUT + '/08-panel-escritorio.png', fullPage: true });
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin desplazamiento horizontal en celular');
  console.log('Errores de consola:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
