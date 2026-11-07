// Modelo 2D de gabinete: XML de un eje inventado con secciones + superficie de una liberación inventada
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'capturas', 'prueba8'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const EJE = path.join(__dirname, 'datos', 'eje-prueba.xml');
const LIB = path.join(__dirname, 'datos', 'liberacion-prueba.xml');
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const OPER = { uid: 'o1', email: 'operario@gmail.com', displayName: 'Pedro Operario' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
}
const store = p => p.evaluate(() => window.__fakeStore());
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); await preparar(ctx);
  const p = await ctx.newPage(); p.on('pageerror', e => { errores.push(e.message); console.log('PAGEERROR', e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts/.test(m.text())) { errores.push(m.text()); console.log('CONSOLE', m.text()); } });
  await p.goto(URL);
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'datos', 'historico-prueba.json')));
  await p.evaluate(([d, u]) => { localStorage.clear(); const st = {}; d.registros.forEach(r => { const { id, ...x } = r; ['fechaCampo', 'fechaLiberacion', 'fechaEntrega'].forEach(k => { x[k] = x[k] ? { __ts: x[k] } : null; }); x.creadoEn = x.fechaCampo; x.origen = 'excel'; st['liberaciones/' + id] = x; });
    st['usuarios/operario@gmail.com'] = { nombre: 'Pedro Operario', rol: 'operario', topografoId: 'GN', activo: true };
    localStorage.setItem('__fakeDB', JSON.stringify(st)); localStorage.setItem('__fakeUser', JSON.stringify(u)); localStorage.setItem('lib.panelVista', JSON.stringify('perfil')); localStorage.setItem('lib.mModo', JSON.stringify('des')); }, [d, ADMIN]);
  await p.reload(); await p.waitForSelector('#nav button');
  await p.waitForFunction(() => Object.keys(window.__fakeStore()).some(k => k.startsWith('resumen/')), null, { timeout: 30000 });

  await p.click('[data-v="panel"]'); await p.waitForSelector('#pSub');
  await p.selectOption('#pSub', 'pp-oeste'); await p.waitForSelector('[data-vista="modelo"]');
  ok(true, 'gabinete/administrador ve la pestaña «Modelo 2D»');
  await p.click('[data-vista="modelo"]'); await p.waitForFunction(() => /Aún no hay modelo/.test(document.querySelector('#mBody')?.textContent || ''));
  ok(true, 'sin modelo: explica qué subir');
  await p.screenshot({ path: OUT + '/01-sin-modelo.png' });

  // XML del eje con secciones
  await p.setInputFiles('#mFile', EJE); await p.waitForSelector('.dlg .mprev');
  const filas = await p.$$eval('.mprev-r', r => r.map(x => [x.querySelector('.mprev-n').childNodes[0].textContent, x.querySelector('select').value]));
  console.log(filas.map(f => f.join(' → ')).join('\n'));
  ok(filas.length === 14, `${filas.length} superficies encontradas en las secciones`);
  ok(filas.filter(f => f[1] === 'dis').length === 6 && filas.filter(f => f[1] === 'lib').length === 6 && filas.filter(f => f[1] === 'no').length === 2, '6 de diseño, 6 liberaciones, 2 «xxx» sin usar');
  ok((await p.textContent('.dlg')).includes('2+634.25') || (await p.textContent('.dlg')).includes('2+634'), 'muestra el largo del eje');
  await p.screenshot({ path: OUT + '/02-subir-eje.png' });
  await p.click('.dlg [type=submit]');
  await p.waitForFunction(() => window.__fakeStore()['secciones/pp-oeste'] && Object.keys(window.__fakeStore()['superficiesRes/pp-oeste']?.r || {}).length === 6, null, { timeout: 20000 });
  const st = await store(p);
  const sec = st['secciones/pp-oeste'];
  ok(sec.est.length === 134 && sec.sups.length === 6, `secciones guardadas: ${sec.est.length} secciones, ${sec.sups.length} superficies, ${Math.round(JSON.stringify(sec).length / 1024)} KB en 1 documento (partes: ${sec.partes})`);
  ok(st['ejes/pp-oeste'].puntos.length / 3 > 50, `eje para la planta: ${st['ejes/pp-oeste'].puntos.length / 3} puntos`);
  const s02161 = Object.entries(st).find(([k, v]) => k.startsWith('superficies/') && v.codigo === 'SKT-TOP-02161')[1];
  ok(s02161.pk0 === 420 && s02161.pk1 === 450 && s02161.tipoId === 'filtro1', `02161 enlazada a su registro: PK ${s02161.pk0}-${s02161.pk1}, tipo ${s02161.tipoId}, Δz ${s02161.dzMed} vs ${s02161.supRef}`);
  await p.waitForSelector('#mPlan .msup'); await p.waitForTimeout(300);
  ok(await p.$$eval('#mPlan .msup', g => g.length) === 6, 'planta desarrollada con 6 liberaciones');
  ok(await p.$('#mSec svg') !== null, 'sección transversal dibujada');
  await p.screenshot({ path: OUT + '/03-modelo-eje.png', fullPage: true });

  // Superficie TIN de una liberación (inventada)
  await p.setInputFiles('#mFile', LIB); await p.waitForSelector('.dlg .mprev-c');
  const txt = await p.textContent('.dlg');
  ok(/SKT-TOP-02686/.test(txt), 'detecta el código SKT-TOP-02686 en el nombre');
  ok(/2\+220/.test(txt) && /2\+260/.test(txt), 'calcula el tramo 2+220 a 2+260 desde la superficie');
  ok(/3 secciones/.test(txt), 'la corta en las 3 secciones del modelo que caen en su tramo (2+220, 2+240 y 2+260)');
  ok(/Δz \+0\.0[2-4] m vs TOP_RELLENO_F1/.test(txt), 'la compara con el tope de relleno F1 (≈ +3 cm)');
  await p.selectOption('.dlg select[name=t0]', 'filtro1'); await p.fill('.dlg input[name=c0]', 'capa 11');
  await p.screenshot({ path: OUT + '/04-subir-superficie.png' });
  await p.click('.dlg [type=submit]');
  await p.waitForFunction(() => Object.keys(window.__fakeStore()['superficiesRes/pp-oeste'].r).length === 7);
  const st2 = await store(p), nueva = Object.entries(st2).find(([k, v]) => k.startsWith('superficies/') && v.codigo === 'SKT-TOP-02686')[1];
  ok(nueva.cs.length === 3 && nueva.borde.length > 6 && Math.abs(nueva.area - 1500) < 60, `superficie guardada: ${nueva.cs.length} cortes, huella de ${nueva.borde.length / 2} puntos, ${nueva.area} m², ${Math.round(JSON.stringify(nueva).length / 1024 * 10) / 10} KB`);
  ok(nueva.capa === 'Capa 11', 'capa normalizada: ' + nueva.capa);
  await p.waitForTimeout(400);
  ok((await p.$eval('#mGrupo', s => s.selectedOptions[0].textContent)).includes('Capa 11'), 'queda elegida su capa');
  ok(/PK 2\+2[2-6]0/.test(await p.textContent('#mSecT')), 'la sección salta a su tramo: ' + await p.textContent('#mSecT'));
  ok(await p.$$eval('#mSec .mcut', c => c.length) >= 1, 'se ve el corte de la liberación en la sección');
  ok(/\+0\.0[1-5] m/.test(await p.textContent('#mSecTab')), 'Δz en la sección: ' + (await p.$eval('#mSecTab td:nth-child(4)', t => t.textContent)));
  await p.screenshot({ path: OUT + '/05-capa-11.png', fullPage: true });
  // Todas las capas, acercar, cambiar sección
  await p.selectOption('#mGrupo', ''); await p.waitForTimeout(200);
  ok(/PK 0\+000/.test(await p.textContent('#mSecT')), 'al elegir «Todas» va a la primera liberación');
  const k2220 = (await store(p))['secciones/pp-oeste'].est.indexOf(2220); await p.$eval('#mSta', (r, k) => { r.value = k; r.dispatchEvent(new Event('input', { bubbles: true })); }, k2220);
  await p.click('[data-mz="+"]'); await p.click('[data-mz="+"]'); await p.waitForTimeout(200);
  ok(await p.$eval('#mPlan svg', s => +s.getAttribute('width') > 3.5 * document.querySelector('#mPlanBox').clientWidth), 'acercar agranda la planta');
  ok(await p.$eval('#mPlanBox', c => c.scrollLeft) > 0, 'y la centra en la sección elegida');
  await p.click('[data-mz="0"]');
  await p.click('[data-mst="-"]'); ok(/PK 2\+200/.test(await p.textContent('#mSecT')), 'sección anterior: ' + await p.textContent('#mSecT'));
  // Elegir la 02161 en la planta y abrir sus datos
  const g = await p.$('#mPlan .msup[data-sid$="0-420-0-450-stn-f1-skt-top-02161"]');
  await g.click(); await p.waitForTimeout(200);
  ok(/PK 0\+4[2-5]0/.test(await p.textContent('#mSecT')), 'tocar una liberación va a su sección: ' + await p.textContent('#mSecT'));
  await p.screenshot({ path: OUT + '/06-todas.png', fullPage: true });
  await p.click('#mLista tr[data-sid$="skt-top-02161"]'); await p.waitForSelector('.dlg #eQuitar');
  ok((await p.textContent('.dlg')).includes('Entregado a Calidad'), 'muestra el estado de su registro');
  await p.screenshot({ path: OUT + '/07-datos.png' });
  await p.fill('.dlg #eC', 'Capa 9'); await p.click('.dlg [type=submit]'); await p.waitForTimeout(300);
  ok((await store(p))['superficiesRes/pp-oeste'].r['pp-oeste~0-420-0-450-stn-f1-skt-top-02161'][3] === 'Capa 9', 'cambiar la capa de una superficie');
  // Quitar con confirmación
  await p.selectOption('#mGrupo', ''); await p.waitForTimeout(200);
  await p.click('#mLista tr[data-sid$="210826etapa2-550-1"]'); await p.waitForSelector('.dlg #eQuitar'); await p.click('.dlg #eQuitar');
  await p.waitForSelector('.dlg .dlg-p'); await p.waitForTimeout(300); ok((await p.textContent('.dlg h3')) === 'Quitar superficie', 'pide confirmar antes de quitar');
  await p.click('.dlg [data-x]'); await p.waitForTimeout(300);
  ok(Object.keys((await store(p))['superficiesRes/pp-oeste'].r).length === 7, 'cancelar no quita nada');
  await p.click('#mLista tr[data-sid$="210826etapa2-550-1"]'); await p.waitForSelector('.dlg #eQuitar'); await p.click('.dlg #eQuitar'); await p.waitForSelector('.dlg .dlg-p'); await p.click('.dlg [type=submit]');
  await p.waitForFunction(() => Object.keys(window.__fakeStore()['superficiesRes/pp-oeste'].r).length === 6);
  ok(true, 'confirmar sí la quita');
  // Recargar: lee el modelo guardado
  await p.reload(); await p.waitForSelector('#mPlan .msup', { timeout: 20000 });
  ok(await p.$$eval('#mPlan path[fill="url(#hDis)"]', x => x.length) >= 1, 'tras recargar se dibuja con lo guardado (huella del diseño)');
  ok(await p.$$eval('#mPlan .msup', x => x.length) === 6, 'y sus 6 liberaciones');

  // Celular
  const ctxM = await b.newContext({ ...devices['iPhone 13'] }); await preparar(ctxM);
  const m = await ctxM.newPage(); m.on('pageerror', e => { errores.push('m: ' + e.message); console.log('PAGEERROR m', e.message); });
  await m.goto(URL); await m.evaluate(([s, u]) => { localStorage.setItem('__fakeDB', s); localStorage.setItem('__fakeUser', JSON.stringify(u)); localStorage.setItem('lib.panelVista', JSON.stringify('modelo')); localStorage.setItem('lib.panelSub', JSON.stringify('pp-oeste')); localStorage.setItem('lib.mModo', JSON.stringify('des')); }, [await p.evaluate(() => localStorage.getItem('__fakeDB')), ADMIN]);
  await m.reload(); await m.waitForSelector('#nav button'); await m.click('[data-v="panel"]'); await m.waitForSelector('#mPlan .msup', { timeout: 20000 });
  await m.selectOption('#mGrupo', 'filtro1|Capa 11'); await m.waitForTimeout(300);
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'celular: sin desplazamiento horizontal');
  await m.screenshot({ path: OUT + '/08-movil.png', fullPage: true });
  await m.setInputFiles('#mFile', LIB); await m.waitForSelector('.dlg .mprev-c'); await m.waitForTimeout(300);
  ok((await m.textContent('.dlg')).includes('Reemplaza la que ya está'), 'subir la misma superficie avisa que la reemplaza');
  await m.screenshot({ path: OUT + '/09-movil-subir.png' }); await m.click('.dlg [data-x]');
  // Operario: no ve la pestaña
  await m.click('#btnSalir'); await m.waitForSelector('#gEntrar'); await m.evaluate(u => { window.__fakeLogin = u; }, OPER); await m.click('#gEntrar'); await m.waitForSelector('#nav button');
  await m.click('[data-v="panel"]'); await m.waitForSelector('.chart-h .tabs');
  ok(!(await m.$('[data-vista="modelo"]')), 'el operario no ve «Modelo 2D»');
  console.log('Errores:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
