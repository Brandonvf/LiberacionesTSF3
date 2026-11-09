// Modelo 2D más fácil de encontrar: los frentes con modelo se marcan, un frente vacío dice dónde sí hay,
// la capa con base se elige sola para ver el porcentaje al abrir y se recuerda la capa elegida en cada frente
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'capturas', 'prueba22'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
}
const escuchar = (p, n) => { p.on('pageerror', e => { errores.push(n + ': ' + e.message); console.log('PAGEERROR', n, e.message); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts/.test(m.text())) { errores.push(n + ': ' + m.text()); console.log('CONSOLE', n, m.text()); } }); };
// Modelo sintético de Presa Auxiliar Norte: base de 100 x 50 m y dos liberaciones que cubren la mitad
const E0 = 450000, N0 = 8300000;
const rect = (x0, y0, x1, y1) => [[E0 + x0, N0 + y0], [E0 + x1, N0 + y0], [E0 + x1, N0 + y1], [E0 + x0, N0 + y1]];
const sup = (id, nombre, codigo, r) => ({ subId: 'pan', nombre, codigo, tipoId: 'fundacion', capa: 'Diseño', grupo: 'fundacion|Diseño', pk0: null, pk1: null, oMin: null, oMax: null, zMed: 780, zMin: 779, zMax: 781, area: 1250, supRef: '', dzMed: null, dzMin: null, dzMax: null, borde: [], bordeEN: r.flat(), cs: [], origen: 'tin', puntos: 4, v: 1, fecha: Date.now() });
const compacto = x => [x.nombre, x.codigo, x.tipoId, x.capa, null, null, null, null, x.zMed, null, x.area, '', 1, x.fecha];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'] }); await preparar(ctx);
  const p = await ctx.newPage(); escuchar(p, 'cel');
  const s1 = sup('pan~a', 'Fundación SKT-TOP-00020', 'SKT-TOP-00020', rect(0, 0, 50, 25)), s2 = sup('pan~b', 'Fundación SKT-TOP-00021', 'SKT-TOP-00021', rect(50, 0, 100, 25));
  await p.goto(URL);
  await p.evaluate(([db, u]) => { localStorage.clear(); localStorage.setItem('__fakeDB', JSON.stringify(db)); localStorage.setItem('__fakeUser', JSON.stringify(u));
    localStorage.setItem('lib.panelSub', JSON.stringify('tls')); localStorage.setItem('lib.panelVista', JSON.stringify('modelo')); }, [{
    'superficies/pan~a': s1, 'superficies/pan~b': s2,
    'superficiesRes/pan': { r: { 'pan~a': compacto(s1), 'pan~b': compacto(s2) } },
    'bases/pan~base-fundacion-diseno': { subId: 'pan', grupo: 'fundacion|Diseño', tipoId: 'fundacion', capa: 'Diseño', nombre: 'Proyectado PAN.xml', area: 5000, v: 1, anillos: [rect(0, 0, 100, 50).map(q => q.join(',')).join(' ')] }
  }, ADMIN]);
  await p.reload(); await p.waitForSelector('#nav button');
  await p.click('#nav [data-v="panel"]'); await p.waitForSelector('#mBody .m-inicio');

  // 1. Frente vacío (Línea Sur): dice dónde sí hay modelo
  await p.waitForSelector('#mOtros [data-irsub="pan"]');
  ok(/Hay modelo en/.test(await p.textContent('#mOtros')) && /Presa Auxiliar Norte\s*2 liberaciones \+ base/.test(await p.textContent('#mOtros')), 'Línea Sur vacía: «Hay modelo en: Presa Auxiliar Norte · 2 liberaciones + base»');
  ok(await p.$eval('#pSub option[value="pan"]', o => o.textContent) === 'Presa Auxiliar Norte · 2 liberaciones + base' && await p.$eval('#pSub option[value="tls"]', o => o.textContent) === 'Línea Sur', 'en la lista de frentes se marcan los que tienen modelo');
  await p.screenshot({ path: path.join(OUT, '1-frente-vacio.png') });

  // 2. Al ir al frente con modelo, la capa con base se elige sola y se ve el porcentaje
  await p.click('#mOtros [data-irsub="pan"]'); await p.waitForSelector('.avc-n b');
  ok(await p.$eval('#pSub', s => s.value) === 'pan' && await p.$eval('#mGrupo', s => s.value) === 'fundacion|Diseño', 'un toque lleva al frente y elige sola la capa «Diseño» (la que tiene base)');
  ok((await p.textContent('.avc-n b')).trim() === '50.0 %', 'el porcentaje se ve al abrir: ' + (await p.textContent('.avc-n b')).trim());
  await p.screenshot({ path: path.join(OUT, '2-capa-sola.png') });

  // 3. Si se elige «Todas», se respeta al volver y hay un atajo a la lista de capas con su avance
  await p.selectOption('#mGrupo', ''); await p.waitForSelector('[data-vercapas]');
  await p.reload(); await p.waitForSelector('#nav button'); await p.waitForSelector('[data-vercapas]');
  ok(await p.$eval('#mGrupo', s => s.value) === '' && await p.$eval('#pSub', s => s.value) === 'pan', 'al volver respeta «Todas» en ese frente');
  await p.click('[data-vercapas]'); await p.waitForTimeout(700);
  ok(await p.$eval('#mCapas .capl', c => { const r = c.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }) && (await p.textContent('#mCapas')).includes('50.0 %'), '«Ver el avance de cada capa» baja a la lista con el porcentaje de cada una');
  await p.screenshot({ path: path.join(OUT, '3-todas.png') });
  // Elegir la capa desde la lista también se recuerda
  await p.click('#mCapas [data-capg="fundacion|Diseño"]'); await p.waitForSelector('.avc-n b');
  await p.reload(); await p.waitForSelector('#nav button'); await p.waitForSelector('.avc-n b');
  ok(await p.$eval('#mGrupo', s => s.value) === 'fundacion|Diseño', 'la capa elegida desde la lista también se recuerda');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'celular sin desplazamiento horizontal');

  await b.close();
  ok(errores.length === 0, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
})();
