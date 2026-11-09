// App instalable: manifiesto, logo en todos los tamaños, botón «Instalar», número en el ícono,
// atajos del ícono con la app abierta, aviso de versión nueva y apertura sin señal con el service worker
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'capturas', 'prueba12'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
}
const escuchar = (p, n) => { p.on('pageerror', e => { errores.push(n + ': ' + e.message); console.log('PAGEERROR', n, e.message); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_INTERNET_DISCONNECTED|fonts/.test(m.text())) { errores.push(n + ': ' + m.text()); console.log('CONSOLE', n, m.text()); } }); };
// Simula lo que hace el navegador cuando la página se puede instalar
const avisoInstalable = p => p.evaluate(() => {
  const e = new Event('beforeinstallprompt', { cancelable: true });
  e.prompt = () => { window.__pidio = (window.__pidio || 0) + 1; }; e.userChoice = Promise.resolve({ outcome: 'accepted' });
  dispatchEvent(e);
});
(async () => {
  const b = await chromium.launch();

  // 1. Manifiesto e íconos
  const ctx = await b.newContext({ ...devices['Pixel 7'] }); await preparar(ctx);
  await ctx.addInitScript(() => {
    window.__insignias = [];
    navigator.setAppBadge = n => { window.__insignias.push(n); return Promise.resolve(); };
    navigator.clearAppBadge = () => { window.__insignias.push(0); return Promise.resolve(); };
    Object.defineProperty(window, 'launchQueue', { configurable: true, value: { setConsumer: f => { window.__lanzar = f; } } });
  });
  const p = await ctx.newPage(); escuchar(p, 'cel');
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload();
  const href = await p.$eval('link[rel=manifest]', l => l.href);
  const man = await (await p.request.get(href)).json();
  ok(man.name === 'Liberaciones TSF3' && man.short_name === 'Liberaciones' && man.display === 'standalone' && man.start_url === './' && man.scope === './', 'manifiesto con nombre, pantalla completa de app e inicio');
  ok(man.icons.some(i => i.sizes === '192x192') && man.icons.some(i => i.sizes === '512x512' && i.purpose === 'any') && man.icons.some(i => i.purpose === 'maskable'), 'íconos 192, 512 y adaptable (Android recorta en círculo o gota)');
  ok(man.shortcuts.map(s => s.url).join() === './#nueva,./#mis,./#bandeja,./#panel', 'atajos del ícono: Nueva, Mis registros, Bandeja y Panel');
  for (const i of man.icons) {
    const dim = await p.evaluate(src => new Promise(ok => { const im = new Image(); im.onload = () => ok(im.naturalWidth + 'x' + im.naturalHeight); im.onerror = () => ok('error'); im.src = src; }), new globalThis.URL(i.src, href).href);
    ok(i.sizes === 'any' ? dim !== 'error' : dim === i.sizes, `ícono ${i.src} carga con ${dim}`);
  }
  ok(await p.$eval('link[rel=apple-touch-icon]', l => l.href.endsWith('apple-touch-icon.png')) && await p.$('link[rel=icon][type="image/svg+xml"]'), 'ícono para iPhone y para la pestaña del navegador');

  // 2. Pantalla de entrada con logo y botón «Instalar como app»
  await p.waitForSelector('#gEntrar');
  ok(await p.$eval('#gate .glogo', i => i.complete && i.naturalWidth > 0), 'la pantalla de entrada muestra el logo');
  ok(await p.$eval('#gInstalar', b => b.hidden), 'sin aviso del navegador no aparece «Instalar»');
  await avisoInstalable(p); await p.waitForTimeout(100);
  ok(await p.$eval('#gInstalar', b => !b.hidden), 'cuando el navegador permite instalar aparece «Instalar como app»');
  await p.screenshot({ path: path.join(OUT, '1-entrada.png') });
  await p.click('#gInstalar'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__pidio) === 1 && /instalada/.test(await p.textContent('#toast')), 'al tocarlo abre el instalador y confirma');
  ok(await p.$eval('#gInstalar', b => b.hidden), 'después de instalar el botón desaparece');

  // 3. Dentro de la app: botón en la cabecera, número en el ícono y atajos
  await p.evaluate(u => {
    localStorage.setItem('__fakeDB', JSON.stringify({ 'solicitudes/x1': { email: 'nuevo@gmail.com', nombre: 'Persona Nueva' }, 'solicitudes/x2': { email: 'otro@gmail.com', nombre: 'Otra Persona' } }));
    localStorage.setItem('__fakeUser', JSON.stringify(u));
  }, ADMIN);
  await p.reload(); await p.waitForSelector('#nav button');
  ok(await p.$eval('#btnInstalar', b => b.hidden), 'cabecera sin «Instalar» mientras el navegador no lo ofrezca');
  await avisoInstalable(p); await p.waitForTimeout(100);
  ok(await p.$eval('#btnInstalar', b => !b.hidden && getComputedStyle(b).display !== 'none'), '«Instalar» también en la cabecera');
  await p.screenshot({ path: path.join(OUT, '2-cabecera.png') });
  await p.waitForFunction(() => window.__insignias.includes(2));
  ok(true, 'el ícono de la app muestra 2 (las solicitudes de acceso pendientes)');
  ok(await p.evaluate(() => typeof window.__lanzar === 'function'), 'la app recibe los atajos cuando ya está abierta');
  await p.evaluate(u => window.__lanzar({ targetURL: u + '#panel' }), URL); await p.waitForTimeout(300);
  ok(await p.$eval('[data-v="panel"]', b => b.getAttribute('aria-current') === 'page'), 'atajo «Panel» con la app abierta: cambia de pantalla sin recargar');
  // Versión nueva con la app ya en uso (recién abierta se recarga sola: ver prueba20)
  await p.waitForFunction(() => performance.now() > 15500, null, { timeout: 20000 });
  await p.evaluate(() => document.dispatchEvent(new Event('version-nueva'))); await p.waitForSelector('#verNueva');
  ok(/versión nueva/.test(await p.textContent('#verNueva')), 'aviso de versión nueva con botón «Actualizar»');
  await p.screenshot({ path: path.join(OUT, '3-version.png') });
  await p.click('#verNueva .x'); await p.waitForTimeout(100);
  ok(!(await p.$('#verNueva')), 'el aviso se puede cerrar');
  await p.click('#btnSalir'); await p.waitForSelector('#gEntrar');
  ok(await p.evaluate(() => window.__insignias.at(-1) === 0), 'al salir se borra el número del ícono');
  await ctx.close();

  // 3b. Entrada directa con Google en la app instalada en iPhone (sin ventana emergente)
  const ctxI = await b.newContext({ ...devices['iPhone 13'] }); await preparar(ctxI);
  const pi = await ctxI.newPage(); escuchar(pi, 'iphone');
  await pi.goto(URL); await pi.evaluate(() => localStorage.clear());
  const email = ADMIN.email, tok = Buffer.from(email).toString('base64');
  // Como si volviera de Google con un estado guardado antes de ir
  await pi.evaluate(([tok, h]) => { localStorage.setItem('lib.oauth', JSON.stringify({ st: 'abc123', hash: h, t: Date.now() })); location.hash = 'id_token=' + tok + '&state=abc123'; }, [tok, '#panel']);
  await pi.reload(); await pi.waitForSelector('#nav button');
  ok(await pi.evaluate(() => location.hash) === '#panel', 'al volver de Google entra, limpia el token de la dirección y vuelve a la pantalla que tenía (Panel)');
  ok(await pi.$eval('[data-v="panel"]', b => b.getAttribute('aria-current') === 'page'), 'y la muestra');
  ok(!(await pi.evaluate(() => localStorage.getItem('lib.oauth'))), 'el estado de la entrada se borra al usarse');
  await pi.click('#btnSalir'); await pi.waitForSelector('#gEntrar');
  await pi.evaluate(tok => { localStorage.setItem('lib.oauth', JSON.stringify({ st: 'otro', hash: '', t: Date.now() })); location.hash = 'id_token=' + tok + '&state=abc123'; }, tok);
  await pi.reload(); await pi.waitForSelector('#gEntrar');
  ok(/No se pudo completar/.test(await pi.textContent('#gate')) && await pi.evaluate(() => location.hash) === '', 'si el estado no coincide no entra y lo explica');
  await ctxI.close();

  // 4. Service worker: guarda todo al instalarse y abre sin señal
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 800 } }); await preparar(ctx2);
  const q = await ctx2.newPage(); escuchar(q, 'sw');
  await q.goto(URL);
  await q.evaluate(u => { localStorage.clear(); localStorage.setItem('__fakeUser', JSON.stringify(u)); }, ADMIN);
  await q.evaluate(() => navigator.serviceWorker.register('sw.js'));
  await q.evaluate(() => navigator.serviceWorker.ready);
  await q.waitForFunction(async () => (await caches.keys()).includes('liberaciones-v17'));
  await q.waitForTimeout(800);
  const guardado = await q.evaluate(async () => (await (await caches.open('liberaciones-v17')).keys()).map(r => r.url));
  const tiene = f => guardado.some(u => u.endsWith(f));
  ok(['/', 'manifest.webmanifest', 'logo.svg', 'icono-192.png', 'icono-512.png', 'apple-touch-icon.png'].every(tiene), 'al instalarse guarda la página, el manifiesto y el logo');
  ok(['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].every(tiene), 'y las librerías de Firebase (abre sin señal aunque nunca se usó sin internet)');
  await q.reload(); await q.waitForSelector('#nav button');
  ok(await q.evaluate(() => !!navigator.serviceWorker.controller), 'la página queda a cargo del service worker');
  await ctx2.setOffline(true);
  await q.reload(); await q.waitForSelector('#nav button', { timeout: 15000 });
  ok(true, 'sin señal la app abre desde el ícono con la copia guardada');
  ok(await q.$eval('#gate', g => g.hidden), 'y entra directo a la sesión');
  await ctx2.setOffline(false); await ctx2.close();

  await b.close();
  ok(errores.length === 0, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
})();
