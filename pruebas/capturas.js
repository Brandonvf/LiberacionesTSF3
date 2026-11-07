// Capturas de las pantallas principales en celular y computadora (para comparar antes/después de un rediseño)
// Uso: node pruebas/capturas.js <carpeta>
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'capturas', 'pantallas')); fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.URL_APP || 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const nuevo = (id, extra) => ({ actividad: 'LIB', estado: 'PT', numero: '', creadoPor: ADMIN.email, origen: 'app', estructuraId: 'pp', subestructuraId: 'pp-oeste', elementoId: 'mt', tipoId: 'filtro1', capa: 'Capa 11', topografoId: 'GN', descripcion: 'Liberación de relleno filtro 1 capa 11 ' + id, fechaCampo: { __ts: Date.now() - 3600e3 }, creadoEn: { __ts: Date.now() - 3600e3 }, archivos: [], ...extra });
(async () => {
  const b = await chromium.launch();
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'datos', 'historico-prueba.json')));
  for (const [nom, opts] of [['pc', { viewport: { width: 1440, height: 900 } }], ['cel', { ...devices['iPhone 13'] }]]) {
    const ctx = await b.newContext(opts);
    await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
    await ctx.route(/fonts\.gstatic/, r => r.abort());
    const p = await ctx.newPage(); await p.goto(URL);
    await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('#gEntrar'); await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(OUT, nom + '-1-entrada.png') });
    await p.evaluate(([d, u, n1, n2, n3]) => { const st = {}; d.registros.forEach(r => { const { id, ...x } = r; ['fechaCampo', 'fechaLiberacion', 'fechaEntrega'].forEach(k => { x[k] = x[k] ? { __ts: x[k] } : null; }); x.creadoEn = x.fechaCampo; x.origen = 'excel'; st['liberaciones/' + id] = x; });
      st['liberaciones/n1'] = n1; st['liberaciones/n2'] = n2; st['liberaciones/n3'] = n3;
      localStorage.setItem('__fakeDB', JSON.stringify(st)); localStorage.setItem('__fakeUser', JSON.stringify(u)); localStorage.setItem('lib.panelVista', JSON.stringify('perfil')); localStorage.setItem('lib.panelSub', JSON.stringify('pp-oeste')); },
      [d, ADMIN, nuevo('n1', { pkInicio: 100, pkFin: 140 }), nuevo('n2', { pkInicio: 140, pkFin: 170 }), nuevo('n3', { pkInicio: 170, pkFin: 200, estado: 'OB', notaObservacion: 'Falta foto' })]);
    await p.reload(); await p.waitForSelector('#nav button');
    await p.waitForFunction(() => Object.keys(window.__fakeStore()).some(k => k.startsWith('resumen/')), null, { timeout: 30000 });
    await p.waitForTimeout(3500);
    const ir = async v => { await p.click(`#nav [data-v="${v}"]`); await p.waitForTimeout(900); };
    await ir('nueva'); await p.screenshot({ path: path.join(OUT, nom + '-2-nueva.png'), fullPage: nom === 'cel' });
    await ir('mis'); await p.screenshot({ path: path.join(OUT, nom + '-3-mis.png') });
    await ir('bandeja'); await p.screenshot({ path: path.join(OUT, nom + '-4-bandeja.png') });
    await ir('todos'); await p.screenshot({ path: path.join(OUT, nom + '-5-registros.png') });
    await ir('panel'); await p.waitForTimeout(800); await p.screenshot({ path: path.join(OUT, nom + '-6-panel.png') });
    await ir('ajustes'); await p.screenshot({ path: path.join(OUT, nom + '-7-ajustes.png') });
    await ir('mis'); await p.click('#lista [data-id]'); await p.waitForTimeout(600); await p.screenshot({ path: path.join(OUT, nom + '-8-ficha.png') });
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    if (!(await p.$('#sheet[hidden]'))) { await p.evaluate(() => history.back()); await p.waitForTimeout(500); }
    await ir('nueva'); await p.fill('#iDesc', 'algo'); await p.click('#bLimpiar'); await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, nom + '-9-dialogo.png') });
    await ctx.close();
  }
  await b.close(); console.log('capturas en', OUT);
})();
