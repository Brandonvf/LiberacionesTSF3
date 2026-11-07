// Mudanza de dirección: la dirección vieja (brandonvf.github.io) avisa y lleva a la nueva
// (topografiatsf3.github.io/liberaciones) solo cuando ya no queda nada por subir
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'capturas', 'prueba13'); fs.mkdirSync(OUT, { recursive: true });
const RAIZ = path.join(__dirname, '..');
const VIEJA = 'https://brandonvf.github.io/LiberacionesTSF3/', NUEVA = 'https://topografiatsf3.github.io/liberaciones/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
const TIPOS = { html: 'text/html', js: 'application/javascript', svg: 'image/svg+xml', png: 'image/png', webmanifest: 'application/manifest+json' };
async function preparar(ctx) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
  // La dirección vieja sirve la app de este repositorio; la nueva, una página simple para saber que se llegó
  await ctx.route(VIEJA + '**', r => {
    let f = new URL(r.request().url()).pathname.replace('/LiberacionesTSF3/', '') || 'index.html';
    const ruta = path.join(RAIZ, f);
    if (!fs.existsSync(ruta)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ path: ruta, contentType: TIPOS[f.split('.').pop()] || 'application/octet-stream' });
  });
  await ctx.route(NUEVA + '**', r => r.fulfill({ contentType: 'text/html', body: '<title>nueva</title><h1 id="nueva">Dirección nueva</h1>' }));
}
const escuchar = (p, n) => { p.on('pageerror', e => { errores.push(n + ': ' + e.message); console.log('PAGEERROR', n, e.message); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts/.test(m.text())) { errores.push(n + ': ' + m.text()); console.log('CONSOLE', n, m.text()); } }); };
(async () => {
  const b = await chromium.launch();
  const nuevo = async () => { const ctx = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' }); await preparar(ctx); const p = await ctx.newPage(); escuchar(p, 'cel'); return [ctx, p]; };

  // 1. Sin sesión: aviso en la pantalla de entrada y botón para ir
  let [ctx, p] = await nuevo();
  await p.goto(VIEJA); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForSelector('#gEntrar'); await p.waitForSelector('#mudanza');
  ok(/se mudó/.test(await p.textContent('#mudanza')), 'la dirección vieja avisa que la app se mudó');
  await p.screenshot({ path: path.join(OUT, '1-entrada.png') });
  await p.click('#mudanza button'); await p.waitForSelector('#nueva');
  ok(p.url() === NUEVA, 'el botón lleva a la dirección nueva');
  await ctx.close();

  // 2. Con sesión y todo subido: pregunta y lleva a la nueva conservando la pantalla
  [ctx, p] = await nuevo();
  await p.goto(VIEJA);
  await p.evaluate(u => { localStorage.clear(); localStorage.setItem('__fakeUser', JSON.stringify(u)); }, ADMIN);
  await p.goto(VIEJA + '#panel'); await p.reload(); await p.waitForSelector('#nav button');
  await p.waitForSelector('.dlg.on'); const txt = await p.textContent('.dlg.on');
  ok(/topografiatsf3\.github\.io\/liberaciones/.test(txt) && /no se pierde nada/.test(txt), 'con todo subido pregunta y explica la dirección nueva');
  await p.screenshot({ path: path.join(OUT, '2-pregunta.png') });
  await p.click('.dlg.on [type=submit]'); await p.waitForSelector('#nueva');
  ok(p.url() === NUEVA + '#panel', 'pasa a la nueva en la misma pantalla (Panel)');
  await ctx.close();

  // 3. «Ahora no»: se queda y el aviso sigue para ir cuando quiera
  [ctx, p] = await nuevo();
  await p.goto(VIEJA);
  await p.evaluate(u => { localStorage.clear(); localStorage.setItem('__fakeUser', JSON.stringify(u)); }, ADMIN);
  await p.reload(); await p.waitForSelector('.dlg.on');
  await p.click('.dlg.on [data-x]'); await p.waitForTimeout(500);
  ok(p.url().startsWith(VIEJA) && await p.$('#mudanza'), 'si dice que no, se queda y el aviso sigue visible');
  await p.click('#mudanza button'); await p.waitForSelector('#nueva');
  ok(p.url().startsWith(NUEVA), 'y puede pasar después con el botón');
  await ctx.close();

  // 4. Con algo por subir: no se mueve hasta que se sube
  [ctx, p] = await nuevo();
  await p.goto(VIEJA);
  await p.evaluate(u => { localStorage.clear(); localStorage.setItem('__fakeUser', JSON.stringify(u)); }, ADMIN);
  await p.evaluate(async () => {
    window.__fakeOffline = true;
    const fs = await import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js');
    fs.setDoc(fs.doc({}, 'historial', 'pendiente1'), { usuario: 'x' });
  });
  await p.reload(); await p.waitForSelector('#nav button');
  // la recarga borra lo pendiente del simulador, así que se vuelve a dejar algo por subir ya dentro de la app
  await p.evaluate(async () => {
    window.__fakeOffline = true;
    const fs = await import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js');
    fs.setDoc(fs.doc({}, 'historial', 'pendiente2'), { usuario: 'x' });
  });
  await p.waitForTimeout(3000);
  ok(!(await p.$('.dlg.on')) && p.url().startsWith(VIEJA), 'con registros por subir no pregunta ni se mueve');
  await p.click('#mudanza button'); await p.waitForTimeout(400);
  ok(p.url().startsWith(VIEJA) && /Subiendo/.test(await p.textContent('#toast')), 'ni siquiera con el botón, mientras falte subir (avisa que está subiendo)');
  await p.evaluate(() => window.__fakeGoOnline()); await p.waitForSelector('#nueva', { timeout: 10000 });
  ok(p.url().startsWith(NUEVA), 'apenas se sube todo, pasa a la nueva');
  await ctx.close();

  // 5. En la dirección de pruebas (o la nueva) no aparece ningún aviso
  [ctx, p] = await nuevo();
  await p.goto('http://127.0.0.1:8765/'); await p.evaluate(u => { localStorage.clear(); localStorage.setItem('__fakeUser', JSON.stringify(u)); }, ADMIN);
  await p.reload(); await p.waitForSelector('#nav button'); await p.waitForTimeout(2000);
  ok(!(await p.$('#mudanza')) && !(await p.$('.dlg.on')), 'fuera de la dirección vieja no hay aviso de mudanza');
  await ctx.close();

  await b.close();
  ok(errores.length === 0, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
})();
