const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const { tipo } = require('./filtros');
const OUT = path.join(__dirname, 'capturas', 'prueba5'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const OPER = { uid: 'o1', email: 'operario@gmail.com', displayName: 'Pedro Operario' };
const GAB = { uid: 'g1', email: 'gabinete@gmail.com', displayName: 'Gabinete Prueba' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  // Estas pruebas son de otros flujos: aceptan solas las confirmaciones (prueba8 prueba cancelar y aceptar)
  await ctx.addInitScript(() => { window.__autoConf = true; new MutationObserver(() => { const f = document.querySelector('.dlg.on form:has(.dlg-p)'); if (f && !f.dataset.auto) { f.dataset.auto = 1; setTimeout(() => f.querySelector('[type=submit]').click(), 30); } }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); });
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
}
const login = async (p, u) => { await p.evaluate(u => { window.__fakeLogin = u; }, u); await p.click('#gEntrar'); };
const salir = async p => { await p.click('#btnSalir'); await p.waitForSelector('#gEntrar'); };
async function registrar(p, o) {
  await p.click('[data-v="nueva"]'); await p.waitForSelector('#fLib:not([hidden])');
  await p.selectOption('#iTopo', 'AB'); await p.selectOption('#iEst', 'pp'); await p.selectOption('#iSub', 'pp-oeste'); await tipo(p, o.tipo);
  await p.fill('#iPk1', o.a); await p.fill('#iPk2', o.b); await p.fill('#iCapa', o.capa || ''); await p.fill('#iDesc', o.d);
  await p.click('#bGuardar'); await p.waitForTimeout(150);
}
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); await preparar(ctx);
  const p = await ctx.newPage(); p.on('pageerror', e => { errores.push(e.message); console.log('PAGEERROR', e.message); });
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('#gEntrar');
  // Admin crea usuarios
  await login(p, ADMIN); await p.waitForSelector('#nav button');
  const navA = await p.$$eval('#nav button', bs => bs.map(b => b.dataset.v));
  ok(navA.join() === 'nueva,mis,bandeja,todos,panel,ajustes', 'admin ve Bandeja: ' + navA.join());
  await p.click('[data-v="ajustes"]'); await p.click('[data-tab="usuarios"]'); await p.waitForSelector('#uMail');
  await p.fill('#uMail', OPER.email); await p.fill('#uNom', OPER.displayName); await p.selectOption('#uRol', 'operario'); await p.selectOption('#uTopo', 'GN'); await p.click('#uAdd'); await p.waitForTimeout(150);
  await p.fill('#uMail', GAB.email); await p.fill('#uNom', GAB.displayName); await p.selectOption('#uRol', 'gabinete'); await p.click('#uAdd'); await p.waitForTimeout(150);
  ok((await p.textContent('#usr')).includes('Pedro Operario'), 'operario creado con rol Operario');
  await salir(p);
  // Operario registra 3
  await login(p, OPER); await p.waitForSelector('#nav button');
  const navO = await p.$$eval('#nav button', bs => bs.map(b => b.dataset.v));
  ok(navO.join() === 'nueva,mis,panel', 'operario ve Nueva, Míos y Panel');
  ok(await p.inputValue('#iTopo') === 'GN', 'operario con su clave preseleccionada');
  await registrar(p, { tipo: 'masivo', a: '2+100', b: '2+140', capa: 'Capa 18', d: 'Relleno masivo capa 18 cota 759.20' });
  await registrar(p, { tipo: 'masivo', a: '2+140', b: '2+180', capa: 'Capa 18', d: 'Relleno masivo capa 18 tramo 2' });
  await registrar(p, { tipo: 'stn', a: '2+180', b: '2+220', d: 'STN para zanja' });
  await salir(p);
  // Gabinete
  await login(p, GAB); await p.waitForSelector('#nav button');
  const navG = await p.$$eval('#nav button', bs => bs.map(b => b.dataset.v));
  ok(navG.join() === 'nueva,mis,bandeja,todos,panel', 'gabinete ve Bandeja');
  ok((await p.textContent('#nav [data-v="bandeja"]')).includes('3'), 'Bandeja con 3 por aceptar');
  await p.click('[data-v="bandeja"]'); await p.waitForSelector('.brow');
  ok(await p.$$eval('.brow', r => r.length) === 3, 'bandeja lista los 3 registros');
  await p.screenshot({ path: OUT + '/01-bandeja.png', fullPage: true });
  // Aceptar uno con nombre
  await p.click('.brow:has-text("STN para zanja") [data-a="aceptar"]'); await p.waitForSelector('.dlg.on');
  await p.fill('#dNom', 'Liberación de superficie de terreno nivelado 2+180 a 2+220');
  await p.screenshot({ path: OUT + '/02-aceptar.png' });
  await p.click('.dlg button[type=submit]'); await p.waitForTimeout(400);
  ok((await p.textContent('#toast')).includes('SKT-TOP-02690'), 'primer código generado: SKT-TOP-02690');
  ok(await p.$$eval('.brow', r => r.length) === 2, 'sale de la bandeja de por aceptar');
  // Observar uno
  await p.click('.brow:has-text("tramo 2") [data-a="observar"]'); await p.waitForSelector('.dlg.on');
  await p.fill('#dNota', 'Falta la foto del tramo'); await p.click('.dlg button[type=submit]'); await p.waitForTimeout(300);
  ok(await p.$$eval('.brow', r => r.length) === 1, 'observada sale de por aceptar');
  await p.click('[data-bt="OB"]'); await p.waitForSelector('.brow');
  ok((await p.textContent('.brow')).includes('Falta la foto'), 'pestaña Observadas con la nota');
  // Aceptar en grupo (2 en PT? solo 1) -> seleccionar
  await p.click('[data-bt="PT"]'); await p.waitForSelector('.brow');
  await p.click('#bAll2'); await p.waitForSelector('#bBulk.on');
  await p.click('[data-bk="aceptar"]'); await p.waitForTimeout(500);
  ok((await p.textContent('#toast')).includes('1 código generado'), 'aceptar en grupo');
  // Por entregar
  await p.click('[data-bt="EP"]'); await p.waitForSelector('.brow');
  const nums = await p.$$eval('.brow .num', n => n.map(x => x.textContent).sort());
  ok(nums.join() === 'SKT-TOP-02690,SKT-TOP-02691', 'códigos únicos y correlativos: ' + nums.join(', '));
  await p.click('#bAll2'); await p.click('[data-bk="entregar"]'); await p.waitForSelector('.dlg.on');
  await p.fill('#dCargo', 'CARGO-77'); await p.screenshot({ path: OUT + '/03-entregar.png' }); await p.click('.dlg button[type=submit]'); await p.waitForTimeout(400);
  ok((await p.textContent('#toast')).includes('2 entregadas'), '2 entregadas a Calidad');
  ok((await p.textContent('#blist')).includes('No hay liberaciones por entregar'), 'bandeja por entregar vacía');
  // Ficha con acciones desde Registros
  await p.click('[data-v="todos"]'); await p.waitForSelector('.item');
  await p.click('.item:has-text("tramo 2")'); await p.waitForSelector('#sheet.on');
  ok(await p.$('#fAceptar') !== null, 'ficha de una observada tiene Aceptar');
  ok((await p.textContent('#hist')).includes('Cambio de estado'), 'historial registra el cambio de estado');
  await p.click('#fCerrar'); await p.waitForTimeout(350);
  await salir(p);
  // Operario ve observación y código
  await login(p, OPER); await p.waitForSelector('#nav button'); await p.click('[data-v="mis"]'); await p.waitForSelector('.item');
  ok((await p.textContent('.list')).includes('Observación: Falta la foto'), 'operario ve la observación');
  ok((await p.textContent('.list')).includes('SKT-TOP-02690'), 'operario ve el código asignado');
  ok(await p.$$eval('.item .st.EC', s => s.length) === 2, 'dos entregadas a Calidad');
  await p.screenshot({ path: OUT + '/04-operario-mis.png', fullPage: true });
  await salir(p);
  // Exportar (admin, escritorio)
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }); await preparar(ctx2);
  const p2 = await ctx2.newPage(); p2.on('pageerror', e => errores.push('2: ' + e.message));
  await p2.goto(URL); await p2.evaluate(([s, u]) => { localStorage.setItem('__fakeDB', s); localStorage.setItem('__fakeUser', JSON.stringify(u)); }, [await p.evaluate(() => localStorage.getItem('__fakeDB')), ADMIN]);
  await p2.reload(); await p2.waitForSelector('#nav button');
  await p2.click('[data-v="bandeja"]'); await p2.waitForSelector('.tabs'); await p2.screenshot({ path: OUT + '/05-bandeja-escritorio.png' });
  await p2.click('[data-v="ajustes"]'); await p2.click('[data-tab="exportar"]'); await p2.waitForSelector('#xReg');
  await p2.click('[data-r="semana"]');
  const [d1] = await Promise.all([p2.waitForEvent('download'), p2.click('#xReg')]);
  const t1 = fs.readFileSync(await d1.path(), 'utf8');
  ok(d1.suggestedFilename().startsWith('registros_') && t1.split('\r\n').length === 4 && t1.includes('SKT-TOP-02690') && t1.includes('CARGO-77') && t1.includes('Key_Topografo'), 'CSV de registros con 3 filas y columnas del Excel');
  const [d2] = await Promise.all([p2.waitForEvent('download'), p2.click('#xDia')]);
  const t2 = fs.readFileSync(await d2.path(), 'utf8');
  ok(t2.includes('Registradas en campo') && t2.includes('Relleno masivo,Capa 18,2,80'), 'CSV de avance diario: 2 registros y 80 m en Capa 18');
  await p2.screenshot({ path: OUT + '/06-exportar.png' });
  console.log('Errores:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
