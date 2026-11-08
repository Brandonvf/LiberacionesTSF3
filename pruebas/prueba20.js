// Actualizaciones: al abrir la app con una copia vieja guardada, si hay versión nueva se recarga sola
// (si todavía no se escribió nada); si ya se está escribiendo, avisa con «Actualizar».
// Y lo nuevo de la app (Levantamiento con dron, equipos) aparece aunque la lista de Firebase aún no lo tenga.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'capturas', 'prueba20'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const OPE = { uid: 'o1', email: 'operario@gmail.com', displayName: 'Pedro Operario' };
const RAIZ = path.join(__dirname, '..');
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
const escuchar = (p, n) => { p.on('pageerror', e => { errores.push(n + ': ' + e.message); console.log('PAGEERROR', n, e.message); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts/.test(m.text())) { errores.push(n + ': ' + m.text()); console.log('CONSOLE', n, m.text()); } }); };
let version = 'v1';
// Cada versión publicada lleva su propio número (v1 → 101, v2 → 102…)
const html = () => fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace(/const VERSION_APP = \d+;/, `const VERSION_APP = ${100 + +version.slice(1)};`).replace('</head>', `<script>window.__version='${version}'</script></head>`);
async function preparar(ctx) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
  // La página «publicada»: cambia de versión cuando la prueba lo indica (con su ETag, como GitHub Pages)
  await ctx.route(u => u.pathname === '/' || u.pathname === '/index.html', r => r.fulfill({ status: 200, contentType: 'text/html', headers: { etag: `"${version}"`, 'cache-control': 'max-age=600' }, body: html() }));
}
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'] }); await preparar(ctx);
  const p = await ctx.newPage(); escuchar(p, 'cel');
  await p.goto(URL);
  await p.evaluate(a => { localStorage.clear(); localStorage.setItem('__fakeUser', JSON.stringify(a)); }, ADMIN);
  await p.evaluate(() => navigator.serviceWorker.register('sw.js')); await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload(); await p.waitForSelector('#nav button');
  ok(await p.evaluate(() => !!navigator.serviceWorker.controller && window.__version === 'v1'), 'la app queda guardada en el teléfono (versión 1)');
  await p.waitForTimeout(800);

  // Se publica la versión 2 y se vuelve a abrir la app: primero abre la copia vieja y se recarga sola a la nueva
  version = 'v2';
  const cargas = []; p.on('load', () => cargas.push(Date.now()));
  await p.reload(); await p.waitForSelector('#nav button');
  await p.waitForFunction(() => window.__version === 'v2', null, { timeout: 15000 }).catch(() => {});
  ok(await p.evaluate(() => window.__version) === 'v2', 'al abrir, si hay versión nueva se pone sola');
  ok(cargas.length === 2, `se nota solo como una recarga rápida al abrir (${cargas.length} cargas)`);
  await p.waitForSelector('#nav button');
  ok(await p.waitForFunction(() => /App actualizada a la versión 102/.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 5000 }).then(() => true, () => false), 'avisa «App actualizada a la versión …»');

  // Con algo escrito no se recarga: aparece el aviso «Hay una versión nueva»
  await p.click('#nav [data-v="nueva"]'); await p.waitForSelector('#iDesc');
  await p.waitForTimeout(15500);  // pasado el arranque
  await p.fill('#iDesc', 'Algo que no debe perderse');
  version = 'v3';
  await p.evaluate(() => fetch('./', { cache: 'no-cache' }));  // la app pide la página (como al reabrirla en segundo plano)
  await p.evaluate(() => navigator.serviceWorker.controller.postMessage && null);
  await p.evaluate(() => document.dispatchEvent(new Event('version-nueva')));
  await p.waitForSelector('#verNueva');
  ok(await p.inputValue('#iDesc') === 'Algo que no debe perderse' && await p.evaluate(() => window.__version) === 'v2', 'si ya se está escribiendo, no recarga: avisa «Hay una versión nueva»');
  ok(/Versión \d+/.test(await (async () => { await p.click('#nav [data-v="mis"]'); await p.waitForTimeout(300); return p.textContent('#view'); })()), 'la versión se ve al final de Mis registros');
  await ctx.close();

  // Lo nuevo aparece aunque la lista guardada en Firebase sea vieja (sin dron ni equipos)
  const c2 = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' }); await preparar(c2);
  const q = await c2.newPage(); escuchar(q, 'lista-vieja');
  await q.goto(URL);
  await q.evaluate(a => { localStorage.clear(); localStorage.setItem('__fakeUser', JSON.stringify(a)); }, ADMIN);
  await q.reload(); await q.waitForSelector('#nav button'); await q.waitForTimeout(800);
  // Como quedó Firebase antes de esta versión: actividades sin dron y sin lista de equipos
  await q.evaluate(u => { const db = JSON.parse(localStorage.getItem('__fakeDB'));
    db['listas/actividades'] = { items: [{ id: 'LIB', nombre: 'Liberación' }, { id: 'LEV', nombre: 'Levantamiento topográfico' }, { id: 'ASP', nombre: 'Aspas para vuelo de dron' }] };
    delete db['listas/equipos'];
    db['usuarios/operario@gmail.com'] = { nombre: 'Pedro Operario', rol: 'operario', topografoId: 'GN', activo: true };
    localStorage.setItem('__fakeDB', JSON.stringify(db)); localStorage.setItem('__fakeUser', JSON.stringify(u)); }, OPE);
  await q.reload(); await q.waitForSelector('#nav button'); await q.waitForTimeout(500);
  if (!(await q.$('#pAct'))) await q.click('#nav [data-v="nueva"]');
  await q.waitForSelector('#pAct');
  ok((await q.$$eval('#pAct [data-act]', x => x.map(e => e.dataset.act))).join() === 'LIB,LEV,DRN,ASP', 'con la lista vieja de Firebase igual aparece «Levantamiento con dron»');
  ok((await q.$$eval('#fEquipo [data-eq]', x => x.length)) === 3, 'y los 3 equipos, así que se puede guardar');
  await b.close();
  ok(errores.length === 0, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
})();
