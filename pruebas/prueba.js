const { chromium, devices } = require('playwright');
const { tipo, equipo } = require('./filtros');
const path = require('path'), fs = require('fs');
const FAKE = path.join(__dirname, 'fake');
const OUT = path.join(__dirname, 'capturas', 'prueba'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const TOPO = { uid: 't1', email: 'alexandre@gmail.com', displayName: 'Alexandre Bellido' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };

async function preparar(ctx) {
  // Estas pruebas son de otros flujos: aceptan solas las confirmaciones (prueba8 prueba cancelar y aceptar)
  await ctx.addInitScript(() => { window.__autoConf = true; new MutationObserver(() => { const f = document.querySelector('.dlg.on form:has(.dlg-p)'); if (f && !f.dataset.auto) { f.dataset.auto = 1; setTimeout(() => f.querySelector('[type=submit]').click(), 30); } }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); });
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, (r) => {
    const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1];
    r.fulfill({ path: path.join(FAKE, f), contentType: 'application/javascript' });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
}
const login = async (page, u) => { await page.evaluate(u => { window.__fakeLogin = u; }, u); await page.click('#gEntrar'); };
const salir = async (page) => { await page.click('#btnSalir'); await page.waitForSelector('#gEntrar'); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await preparar(ctx);
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', e => errores.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForSelector('#gEntrar');
  await page.screenshot({ path: OUT + '/01-entrar.png' });

  // Administrador entra y se cargan las listas
  await login(page, ADMIN);
  await page.waitForSelector('#fLib:not([hidden])');
  ok((await page.textContent('#meRol')).includes('Administrador'), 'admin entra con rol Administrador');
  const navs = await page.$$eval('#nav button', bs => bs.map(b => b.dataset.v));
  ok(navs.join() === 'nueva,mis,bandeja,todos,panel,ajustes', 'admin ve 4 secciones: ' + navs.join());
  ok(await page.$$eval('#iEst option', o => o.length) === 7, 'estructuras precargadas');

  // Validación
  await page.click('#bGuardar');
  ok(await page.$$eval('.f.err', e => e.length) >= 4, 'marca campos obligatorios');
  await page.screenshot({ path: OUT + '/02-errores.png', fullPage: true });

  // Llenar formulario
  await page.selectOption('#iTopo', 'AB');
  await page.selectOption('#iEst', 'pp');
  await page.selectOption('#iSub', 'pp-oeste');
  await tipo(page, 'filtro2');
  await page.fill('#iPk1', '2+627');
  await page.fill('#iPk2', '2642');
  await page.locator('#iPk2').blur();
  ok(await page.inputValue('#iPk2') === '2+642', 'PK se formatea a 2+642');
  await page.click('#bVar');
  await page.fill('#iArea', '229.4');
  await page.fill('#iDesc', 'Liberación de relleno filtro 2 para el acondicionamiento de geomembrana');
  await page.setInputFiles('#fCsv', { name: 'lev.csv', mimeType: 'text/csv', buffer: Buffer.from('P1,1,2,3') });
  await page.waitForSelector('.arch');
  ok(await page.$$eval('.arch', l => l.length) === 1, 'CSV agregado');
  ok(await page.$('#iCsv') === null, 'ya no hay enlaces de Drive');
  await page.screenshot({ path: OUT + '/03-form-lleno.png', fullPage: true });
  await page.click('#bGuardar');
  await page.waitForTimeout(300);
  ok((await page.textContent('#toast')).includes('guardada'), 'aviso de guardado');
  ok(await page.inputValue('#iEst') === 'pp' && await page.inputValue('#iDesc') === '', 'recuerda estructura y limpia descripción');

  // PK final menor que inicio
  await page.fill('#iPk1', '2+200'); await page.fill('#iPk2', '2+100'); await page.fill('#iDesc', 'x');
  await page.click('#bGuardar');
  ok((await page.textContent('.f.err .err-msg')).includes('menor'), 'valida PK final >= inicio');

  // Sin señal
  await page.fill('#iPk1', '2+100'); await page.fill('#iPk2', '2+140');
  await tipo(page, 'stn');
  await page.fill('#iDesc', 'Superficie de terreno nivelado sin señal');
  await page.evaluate(() => { window.__fakeOffline = true; });
  await ctx.setOffline(true);
  await page.click('#bGuardar');
  await page.waitForTimeout(300);
  ok((await page.textContent('#toast')).includes('teléfono'), 'sin señal: guardado en el teléfono');
  await page.click('[data-v="mis"]');
  await page.waitForSelector('.item');
  ok(await page.$$eval('.item', i => i.length) === 2, 'mis registros tiene 2');
  ok(await page.$$eval('.pend-tag', i => i.length) === 1, 'uno marcado «Por subir»');
  ok((await page.textContent('#sync')).includes('por subir'), 'cabecera indica pendiente');
  await page.screenshot({ path: OUT + '/04-mis-sin-senal.png' });
  await ctx.setOffline(false);
  await page.evaluate(() => window.__fakeGoOnline());
  await page.waitForTimeout(200);
  ok(await page.$$eval('.pend-tag', i => i.length) === 0, 'al volver la señal se sube');

  // Ficha e historial
  await page.click('.item:has-text("filtro 2")');
  await page.waitForSelector('#sheet.on');
  await page.waitForTimeout(400);
  ok((await page.textContent('#sheet')).includes('2+627 – 2+642'), 'ficha muestra progresiva');
  ok((await page.textContent('#hist')).includes('Registrado'), 'historial con registro');
  await page.screenshot({ path: OUT + '/05-ficha.png' });
  await page.click('#fEditar');
  await page.waitForSelector('#fLib');
  ok(await page.inputValue('#iPk1') === '2+627', 'editar carga datos');
  await page.fill('#iObs', 'Corregido');
  await page.click('#bGuardar');
  await page.waitForSelector('.item');
  ok(true, 'edición guardada y vuelve a la lista');

  // Búsqueda y filtro
  await page.fill('#q', 'filtro'); await page.waitForTimeout(300);
  ok(await page.$$eval('.item', i => i.length) === 1, 'búsqueda filtra');
  await page.fill('#q', ''); await page.waitForTimeout(300);

  // Recargar: persistencia
  await page.reload();
  await page.waitForSelector('#nav button');
  await page.click('[data-v="mis"]');
  await page.waitForSelector('.item');
  ok(await page.$$eval('.item', i => i.length) === 2, 'tras recargar siguen los 2 registros');

  // Cuenta nueva: solicitud
  await salir(page);
  await login(page, TOPO);
  await page.waitForSelector('text=Acceso solicitado');
  ok(true, 'cuenta nueva queda en espera');
  await page.screenshot({ path: OUT + '/06-espera.png' });
  await page.click('#gSalir'); await page.waitForSelector('#gEntrar');

  // Admin aprueba
  await login(page, ADMIN);
  await page.waitForSelector('#nav');
  await page.click('[data-v="ajustes"]'); await page.click('[data-tab="usuarios"]');
  await page.waitForSelector('[data-uid]');
  await page.selectOption('[data-uid] [data-k="topo"]', 'AB');
  await page.screenshot({ path: OUT + '/07-usuarios.png', fullPage: true });
  await page.click('[data-ap]');
  await page.waitForTimeout(300);
  ok(await page.$$eval('[data-mail]', r => r.length) === 2, 'usuario aprobado aparece con acceso');
  await salir(page);

  // Topógrafo entra
  await login(page, TOPO);
  await page.waitForSelector('#nav button');
  const navT = await page.$$eval('#nav button', bs => bs.map(b => b.dataset.v));
  ok(navT.join() === 'nueva,mis,panel', 'topógrafo ve solo Nueva y Mis registros');
  await page.click('[data-v="nueva"]');
  await page.waitForSelector('#fLib:not([hidden])');
  ok(await page.inputValue('#iTopo') === 'AB', 'topógrafo tiene su clave preseleccionada');
  // Abrir la app con la sesión ya iniciada: la clave sigue elegida aunque las listas lleguen después
  await page.evaluate(() => localStorage.removeItem('lib.borrador.alexandre@gmail.com'));
  await page.reload(); await page.waitForSelector('#nav button');
  await page.click('[data-v="nueva"]'); await page.waitForSelector('#fLib:not([hidden])'); await page.waitForTimeout(300);
  ok(await page.inputValue('#iTopo') === 'AB', 'al reabrir con la sesión iniciada, la clave del topógrafo sigue elegida');
  await page.click('[data-act="LEV"]');
  ok((await page.textContent('#tSel .flabel')).includes('opcional'), 'levantamiento: tipo opcional');
  await page.selectOption('#iEst', 'cas');
  ok(await page.inputValue('#iSub') === '', 'caseta con 2 opciones pide elegir');
  await page.selectOption('#iSub', 'cas-01');
  await page.check('#iSinPk');
  await page.fill('#iDesc', 'Levantamiento de ubicación final de caseta 01');
  await page.click('#bGuardar'); await page.waitForTimeout(200);
  ok(/Marca con qué equipo/.test(await page.textContent('#fEquipo')), 'el equipo es obligatorio al registrar');
  await page.click('#fEquipo [data-eq="ET"]');
  await page.click('#bGuardar');
  await page.waitForTimeout(200);
  await page.click('[data-v="mis"]');
  await page.waitForSelector('.item');
  ok((await page.textContent('.item')).includes('Levantamiento'), 'levantamiento queda como Levantamiento');
  await page.screenshot({ path: OUT + '/08-topografo-mis.png' });

  // Escritorio
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await preparar(ctx2);
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => errores.push('pageerror2: ' + e.message));
  await p2.goto(URL);
  await p2.evaluate(s => localStorage.setItem('__fakeDB', s), await page.evaluate(() => localStorage.getItem('__fakeDB')));
  await p2.reload(); await p2.waitForSelector('#gEntrar');
  await login(p2, ADMIN);
  await p2.waitForSelector('#nav button');
  await p2.click('[data-v="nueva"]'); await p2.waitForSelector('#fLib:not([hidden])');
  await p2.screenshot({ path: OUT + '/09-escritorio-form.png' });
  await p2.click('[data-v="todos"]'); await p2.waitForSelector('.rtab tbody tr');
  ok(await p2.$$eval('.rtab tbody tr', i => i.length) === 3, 'gabinete/admin ve los 3 registros en Registros (tabla en computadora)');
  await p2.screenshot({ path: OUT + '/10-escritorio-registros.png' });
  const anchoOk = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  ok(anchoOk, 'sin desplazamiento horizontal en celular');

  console.log('Errores de consola:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
