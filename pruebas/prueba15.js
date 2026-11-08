// Aspas para vuelo de dron: llegan a la bandeja del administrador y del jefe de área para procesarlas
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const { equipo } = require('./filtros');
const OUT = path.join(__dirname, 'capturas', 'prueba15'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const OPE = { uid: 'o1', email: 'operario@gmail.com', displayName: 'Pedro Operario' };
const JEFE = { uid: 'j1', email: 'jefe@gmail.com', displayName: 'Jefe Prueba' };
const GAB = { uid: 'g1', email: 'gabinete@gmail.com', displayName: 'Gabinete Prueba' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
}
const escuchar = (p, n) => { p.on('pageerror', e => { errores.push(n + ': ' + e.message); console.log('PAGEERROR', n, e.message); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts/.test(m.text())) { errores.push(n + ': ' + m.text()); console.log('CONSOLE', n, m.text()); } }); };
async function entrarComo(p, u) { await p.click('#btnSalir'); await p.waitForSelector('#gEntrar'); await p.evaluate(u => { window.__fakeLogin = u; }, u); await p.click('#gEntrar'); await p.waitForSelector('#nav button'); await p.waitForTimeout(500); }
const tabs = p => p.$$eval('#view .tabs [data-bt]', b => b.map(x => x.dataset.bt));
const badge = p => p.$eval('#nav [data-v="bandeja"]', b => b.querySelector('.badge')?.textContent || '');
const ext = (u, n) => ({ actividad: 'ASP', estado: 'NA', numero: '', creadoPor: OPE.email, origen: 'app', estructuraId: 'pp', subestructuraId: 'pp-oeste', elementoId: '', tipoId: '', topografoId: 'GN', descripcion: 'Aspas para vuelo de dron ' + n, fechaCampo: { __ts: Date.now() - n * 3600e3 }, creadoEn: { __ts: Date.now() - n * 3600e3 }, archivos: [], ...u });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await preparar(ctx);
  const p = await ctx.newPage(); escuchar(p, 'pc');
  await p.goto(URL);
  await p.evaluate(([o, j, g, a1, a2, l1, ADMIN]) => {
    localStorage.clear();
    localStorage.setItem('__fakeDB', JSON.stringify({
      'usuarios/operario@gmail.com': { nombre: 'Pedro Operario', rol: 'operario', topografoId: 'GN', activo: true },
      'usuarios/jefe@gmail.com': { nombre: 'Jefe Prueba', rol: 'jefe', activo: true },
      'usuarios/gabinete@gmail.com': { nombre: 'Gabinete Prueba', rol: 'gabinete', activo: true },
      'liberaciones/a1': a1, 'liberaciones/a2': a2, 'liberaciones/l1': l1 }));
    localStorage.setItem('__fakeUser', JSON.stringify(ADMIN));
  }, [OPE, JEFE, GAB, ext({}, 3), ext({ subestructuraId: 'pp-este' }, 5),
      { ...ext({}, 1), actividad: 'LIB', estado: 'PT', elementoId: 'mt', tipoId: 'filtro1', pkInicio: 100, pkFin: 120, descripcion: 'Liberación normal' }, ADMIN]);
  await p.reload(); await p.waitForSelector('#nav button'); await p.waitForTimeout(800);
  await entrarComo(p, OPE);

  // 1. En campo: registrar aspas con un CSV
  ok(!(await p.$('#nav [data-v="bandeja"]')), 'el operario no tiene bandeja');
  await p.click('#nav [data-v="nueva"]'); await p.waitForSelector('#fLib');
  await p.click('[data-act="ASP"]'); await p.waitForTimeout(150);
  await p.selectOption('#iTopo', 'GN'); await p.selectOption('#iEst', 'pp'); await p.waitForTimeout(100); await p.selectOption('#iSub', 'pp-oeste');
  await p.check('#iSinPk'); await p.fill('#iDesc', 'Aspas zona norte para vuelo del lunes');
  await p.setInputFiles('#fCsv', { name: 'aspas.csv', mimeType: 'text/csv', buffer: Buffer.from('P,N,E,Z\n1,8300000,450000,780\n2,8300050,450050,781\n') });
  await p.waitForSelector('.archs .arch');
  await equipo(p); await p.click('#bGuardar'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => Object.values(window.__fakeStore()).some(x => x && x.actividad === 'ASP' && x.descripcion === 'Aspas zona norte para vuelo del lunes')), 'el operario registra aspas con su CSV');

  // 2. Administrador: pestaña Aspas en la bandeja, con número en el menú
  await entrarComo(p, ADMIN);
  await p.waitForTimeout(500);
  ok(await badge(p) === '4', `el número de la bandeja suma 1 por aceptar + 3 aspas por procesar (${await badge(p)})`);
  await p.click('#nav [data-v="bandeja"]'); await p.waitForTimeout(300);
  ok((await tabs(p)).join() === 'PT,OB,EP,ASP', 'el administrador ve las pestañas de gabinete y «Aspas»');
  ok(/Aspas\s*3/.test(await p.textContent('[data-bt="ASP"]')), 'la pestaña Aspas cuenta 3 por procesar');
  await p.click('[data-bt="ASP"]'); await p.waitForTimeout(300);
  const filas = await p.$$eval('#blist tr[data-rid]', r => r.map(x => x.querySelector('.tdesc b').textContent));
  ok(filas.length === 3 && filas.every(t => /aspas/i.test(t)), 'solo aparecen los levantamientos de aspas: ' + filas.join(' | '));
  ok((await p.textContent('#blist')).includes('1 CSV'), 'se ve cuántos archivos trae cada uno');
  await p.screenshot({ path: path.join(OUT, '1-admin-aspas.png') });
  // Ficha con el CSV para descargar y el botón de procesar
  await p.click('#blist tr[data-rid] >> nth=2 >> td.tdesc'); await p.waitForSelector('#sheet.on');
  ok(await p.$('#fArch [data-arch]') && await p.$('#fProcesar'), 'en la ficha: el CSV para descargar y «Marcar procesado»');
  const [descarga] = await Promise.all([p.waitForEvent('download'), (async () => { await p.waitForTimeout(400); await p.click('#fArch [data-arch]'); })()]);
  ok(descarga.suggestedFilename() === 'aspas.csv', 'el CSV se descarga desde la ficha');
  await p.click('#fProcesar'); await p.waitForTimeout(500);
  ok(/Aspas\s*2/.test(await p.textContent('[data-bt="ASP"]')) && await badge(p) === '3', 'al procesar baja a 2 por procesar');
  const reg = await p.evaluate(() => Object.values(window.__fakeStore()).find(x => x && x.descripcion === 'Aspas zona norte para vuelo del lunes'));
  ok(reg.procesado === true && reg.procesadoPor === 'brandonkluivertvillegasfranco@gmail.com' && reg.procesadoEn, 'queda quién y cuándo lo procesó');
  ok(await p.evaluate(() => Object.values(window.__fakeStore()).some(x => x && x.accion === 'procesado')), 'queda en el historial');

  // 3. Jefe de área: bandeja solo con Aspas; marca varios juntos y puede devolver
  await entrarComo(p, JEFE);
  ok(await p.$('#nav [data-v="bandeja"]') && await badge(p) === '2', 'el jefe tiene bandeja con 2 por procesar');
  await p.click('#nav [data-v="bandeja"]'); await p.waitForTimeout(300);
  ok((await tabs(p)).length === 0 && /Por procesar\s*2/.test(await p.textContent('[data-asp="por"]')), 'el jefe ve solo las aspas (sin aceptar ni entregar liberaciones)');
  ok(!(await p.textContent('#view')).includes('Liberación normal'), 'las liberaciones normales no aparecen');
  await p.click('#bAll2'); await p.waitForTimeout(150); await p.click('[data-bk="procesar"]'); await p.waitForTimeout(500);
  ok(/Por procesar\s*0/.test(await p.textContent('[data-asp="por"]')) && /Procesadas\s*3/.test(await p.textContent('[data-asp="hechas"]')), 'marca varios a la vez');
  await p.click('[data-asp="hechas"]'); await p.waitForTimeout(200);
  ok((await p.textContent('#blist')).includes('Jefe Prueba'), 'en «Procesadas» se ve quién lo procesó');
  await p.screenshot({ path: path.join(OUT, '2-jefe-procesadas.png') });
  await p.click('#blist tr[data-rid] >> nth=0 >> [data-a="desprocesar"]'); await p.waitForSelector('.dlg.on'); await p.click('.dlg.on [type=submit]'); await p.waitForTimeout(500);
  ok(/Por procesar\s*1/.test(await p.textContent('[data-asp="por"]')), 'se puede devolver a «Por procesar»');
  await p.click('#blist tr[data-rid] >> nth=0 >> td.tdesc'); await p.waitForSelector('#sheet.on');
  ok(await p.$('#fProcesar') || await p.$('#fDesprocesar'), 'el jefe también procesa desde la ficha');
  await p.click('.sheet-x'); await p.waitForSelector('#sheet', { state: 'hidden' });

  // 4. Gabinete: no ve la pestaña Aspas
  await entrarComo(p, GAB);
  await p.click('#nav [data-v="bandeja"]'); await p.waitForTimeout(300);
  ok((await tabs(p)).join() === 'PT,OB,EP', 'gabinete no ve la pestaña Aspas');
  ok(await badge(p) === '1', 'y su número solo cuenta lo que tiene por aceptar');

  // 5. Celular (jefe)
  const ctxM = await b.newContext({ ...devices['iPhone 13'] }); await preparar(ctxM);
  const m = await ctxM.newPage(); escuchar(m, 'cel');
  await m.goto(URL); await m.evaluate(([s, u]) => { localStorage.setItem('__fakeDB', s); localStorage.setItem('__fakeUser', JSON.stringify(u)); }, [await p.evaluate(() => localStorage.getItem('__fakeDB')), JEFE]);
  await m.reload(); await m.waitForSelector('#nav button'); await m.click('#nav [data-v="bandeja"]'); await m.waitForTimeout(400);
  ok(await m.$$eval('#blist .brow', r => r.length) === 1 && await m.$('#blist [data-a="procesar"]'), 'celular: tarjetas con «Marcar procesado»');
  await m.screenshot({ path: path.join(OUT, '3-jefe-celular.png') });
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'celular sin desplazamiento horizontal');

  await b.close();
  ok(errores.length === 0, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
})();
