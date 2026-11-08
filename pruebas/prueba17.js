// Cambio de rol con la app abierta: si a alguien lo pasan de topógrafo a gabinete, la Bandeja le aparece sola
// (sin tener que cerrar la app), sin perder lo que estaba escribiendo. Y al aprobar una solicitud el rol elegido no se pierde.
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'capturas', 'prueba17'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const NUEVO = { uid: 'n1', email: 'nuevo.gabinete@gmail.com', displayName: 'Persona Nueva' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
}
const escuchar = (p, n) => { p.on('pageerror', e => { errores.push(n + ': ' + e.message); console.log('PAGEERROR', n, e.message); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts/.test(m.text())) { errores.push(n + ': ' + m.text()); console.log('CONSOLE', n, m.text()); } }); };
const nav = p => p.$$eval('#nav [data-v]', b => b.map(x => x.dataset.v));
// Cambia un documento como si lo hiciera otra persona desde otro equipo
const cambiarDoc = (p, ruta, datos) => p.evaluate(async ([ruta, datos]) => { const fs = await import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js'); const [c, id] = ruta.split('/'); await fs.setDoc(fs.doc({}, c, id), datos, { merge: true }); }, [ruta, datos]);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); await preparar(ctx);
  const p = await ctx.newPage(); escuchar(p, 'cel');
  await p.goto(URL);
  // Primero entra el administrador (crea las listas), luego la persona nueva aprobada como topógrafo
  await p.evaluate(a => { localStorage.clear(); localStorage.setItem('__fakeUser', JSON.stringify(a)); }, ADMIN);
  await p.reload(); await p.waitForSelector('#nav button'); await p.waitForTimeout(500);
  await cambiarDoc(p, 'usuarios/nuevo.gabinete@gmail.com', { nombre: 'Persona Nueva', rol: 'topografo', topografoId: '', activo: true });
  await p.evaluate(u => localStorage.setItem('__fakeUser', JSON.stringify(u)), NUEVO);
  await p.reload(); await p.waitForSelector('#nav button');
  ok((await nav(p)).join() === 'nueva,mis,panel', 'aprobada como topógrafo: Nueva, Míos y Panel');
  await p.fill('#iDesc', 'Estaba escribiendo esto');
  // El administrador le cambia el rol a gabinete mientras tiene la app abierta
  await cambiarDoc(p, 'usuarios/nuevo.gabinete@gmail.com', { rol: 'gabinete' });
  await p.waitForSelector('#nav [data-v="bandeja"]', { timeout: 8000 }).catch(() => {});
  ok((await nav(p)).includes('bandeja') && (await nav(p)).includes('todos'), 'al pasarla a gabinete le aparecen Bandeja y Registros sin cerrar la app: ' + (await nav(p)).join());
  await p.waitForTimeout(700);
  ok(/ahora entras como Gabinete/.test(await p.textContent('#toast')), 'se le avisa que su acceso cambió');
  await p.click('#nav [data-v="nueva"]'); await p.waitForSelector('#iDesc');
  ok(await p.inputValue('#iDesc') === 'Estaba escribiendo esto', 'no pierde lo que estaba escribiendo');
  await p.click('#nav [data-v="bandeja"]'); await p.waitForSelector('#view .tabs [data-bt="PT"]');
  ok(true, 'la Bandeja de gabinete abre con sus pestañas');
  await p.screenshot({ path: path.join(OUT, '1-gabinete.png') });
  await ctx.close();

  // Aprobar una solicitud: el rol elegido se mantiene aunque la lista se redibuje
  const ctx2 = await b.newContext({ viewport: { width: 1440, height: 900 } }); await preparar(ctx2);
  const q = await ctx2.newPage(); escuchar(q, 'pc');
  await q.goto(URL);
  await q.evaluate(a => { localStorage.clear(); localStorage.setItem('__fakeDB', JSON.stringify({ 'solicitudes/s1': { email: 'otra@gmail.com', nombre: 'Otra Persona' } })); localStorage.setItem('__fakeUser', JSON.stringify(a)); }, ADMIN);
  await q.reload(); await q.waitForSelector('#nav button');
  await q.click('#nav [data-v="ajustes"]'); await q.waitForSelector('#sol [data-uid="s1"]');
  await q.selectOption('#sol [data-uid="s1"] [data-k="rol"]', 'gabinete');
  await cambiarDoc(q, 'solicitudes/s2', { email: 'tercera@gmail.com', nombre: 'Tercera Persona' }); await q.waitForSelector('#sol [data-uid="s2"]');
  ok(await q.inputValue('#sol [data-uid="s1"] [data-k="rol"]') === 'gabinete', 'si llega otra solicitud mientras eliges, el rol elegido no vuelve a «Topógrafo»');
  await q.click('#sol [data-uid="s1"] [data-ap]'); await q.waitForSelector('.dlg.on');
  ok(/Gabinete/.test(await q.textContent('.dlg.on')), 'la confirmación dice «Gabinete»');
  await q.click('.dlg.on [type=submit]'); await q.waitForTimeout(500);
  ok(await q.evaluate(() => window.__fakeStore()['usuarios/otra@gmail.com']?.rol) === 'gabinete', 'queda aprobada como gabinete');
  await b.close();
  ok(errores.length === 0, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
})();
