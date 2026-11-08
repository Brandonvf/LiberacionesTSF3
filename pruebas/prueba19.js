// Fotos HEIC (Samsung con «Imágenes de alta eficiencia», iPhone): se convierten a JPG en el teléfono antes de subirlas
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'capturas', 'prueba19'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const HEIC = path.join(__dirname, 'datos', 'foto-prueba.heic'), PNG = path.join(__dirname, 'datos', 'foto-prueba.png');
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx, conConversor = true) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
  if (!conConversor) await ctx.route(/heic2any/, r => r.abort());
}
const escuchar = (p, n) => { p.on('pageerror', e => { errores.push(n + ': ' + e.message); console.log('PAGEERROR', n, e.message); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts|heic2any/.test(m.text())) { errores.push(n + ': ' + m.text()); console.log('CONSOLE', n, m.text()); } }); };
async function abrir(b, conConversor) {
  const ctx = await b.newContext({ ...devices['Galaxy S9+'] }); await preparar(ctx, conConversor);
  const p = await ctx.newPage(); escuchar(p, conConversor ? 'samsung' : 'samsung-sin-conversor');
  await p.goto(URL); await p.evaluate(a => { localStorage.clear(); localStorage.setItem('__fakeUser', JSON.stringify(a)); }, ADMIN);
  await p.reload(); await p.waitForSelector('#nav button'); await p.waitForTimeout(600);
  if (!(await p.$('#fFoto'))) await p.click('#nav [data-v="nueva"]');
  await p.waitForSelector('#fFoto', { state: 'attached' });
  return [ctx, p];
}
(async () => {
  const b = await chromium.launch();
  let [ctx, p] = await abrir(b, true);
  ok(await p.evaluate(() => typeof window.heic2any === 'undefined'), 'el conversor no se carga si no hace falta');
  await p.setInputFiles('#fFoto', PNG); await p.waitForSelector('.archs .arch');
  ok(await p.evaluate(() => typeof window.heic2any === 'undefined'), 'una foto normal no usa el conversor');
  const t0 = Date.now();
  await p.setInputFiles('#fFoto', HEIC);
  await p.waitForFunction(() => document.querySelectorAll('.archs .arch').length === 2, null, { timeout: 30000 });
  const seg = ((Date.now() - t0) / 1000).toFixed(1);
  const nombres = await p.$$eval('.archs .arch b', x => x.map(e => e.textContent));
  ok(nombres.includes('foto-prueba.jpg'), `la foto HEIC se convierte y queda como «foto-prueba.jpg» (${seg} s)`);
  const datos = await p.evaluate(() => { const f = [...document.querySelectorAll('.archs .arch img')].map(i => i.src); return f; });
  ok(datos.some(u => u.startsWith('data:image/jpeg')), 'queda en JPG, reducida como las demás');
  await p.screenshot({ path: path.join(OUT, '1-heic-convertida.png'), fullPage: false });
  await ctx.close();

  // Sin poder bajar el conversor (sin señal la primera vez): mensaje claro con qué hacer
  [ctx, p] = await abrir(b, false);
  await p.setInputFiles('#fFoto', HEIC); await p.waitForTimeout(1500);
  const msg = await p.textContent('#toast');
  ok(/HEIC/.test(msg) && /alta eficiencia/.test(msg) && !(await p.$('.archs .arch')), 'si no se puede convertir, explica qué hacer: ' + msg.trim());
  await p.screenshot({ path: path.join(OUT, '2-sin-conversor.png') });
  await ctx.close();

  await b.close();
  ok(errores.length === 0, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
})();
