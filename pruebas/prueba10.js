// Repaso de errores y flujo: ficha en pantallas medianas, «atrás», búsqueda por capa, aceptar sin señal,
// corregir entregados con motivo, aviso de superposición, depuración de fotos, jefe en Modelo 2D, avance diario
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'capturas', 'prueba10'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const OPER = { uid: 'o1', email: 'operario@gmail.com', displayName: 'Pedro Operario' };
const GAB = { uid: 'g1', email: 'gabinete@gmail.com', displayName: 'Gabinete Prueba' };
const JEFE = { uid: 'j1', email: 'jefe@gmail.com', displayName: 'Jefe Prueba' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
}
const store = p => p.evaluate(() => window.__fakeStore());
const escuchar = (p, n) => { p.on('pageerror', e => { errores.push(n + ': ' + e.message); console.log('PAGEERROR', n, e.message); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts/.test(m.text())) { errores.push(n + ': ' + m.text()); console.log('CONSOLE', n, m.text()); } }); };
const ahora = Date.now(), dia = 86400e3;
const reg = (extra) => ({ actividad: 'LIB', estado: 'PT', numero: '', creadoPor: 'operario@gmail.com', origen: 'app', estructuraId: 'pp', subestructuraId: 'pp-oeste', elementoId: 'mt', tipoId: 'filtro1', capa: 'Capa 11', topografoId: 'GN', descripcion: 'Liberación de relleno filtro 1 capa 11', fechaCampo: { __ts: ahora - 3600e3 }, creadoEn: { __ts: ahora - 3600e3 }, archivos: [], ...extra });
async function entrarComo(p, u) { await p.click('#btnSalir'); await p.waitForSelector('#gEntrar'); await p.evaluate(u => { window.__fakeLogin = u; }, u); await p.click('#gEntrar'); await p.waitForSelector('#nav button'); }
const aceptarDlg = async p => { await p.waitForSelector('.dlg.on [type=submit]'); await p.waitForTimeout(250); await p.click('.dlg.on [type=submit]'); await p.waitForTimeout(300); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1100, height: 860 }, acceptDownloads: true }); await preparar(ctx);
  const p = await ctx.newPage(); escuchar(p, 'pc');
  await p.goto(URL);
  await p.evaluate(([u, regs]) => {
    localStorage.clear(); const st = {};
    Object.entries(regs).forEach(([id, r]) => { st['liberaciones/' + id] = r; });
    st['archivos/f1'] = { liberacionId: 'e1', tipo: 'foto', nombre: 'foto.jpg', tam: 200000, datos: 'data:image/jpeg;base64,AAAA', creadoPor: 'operario@gmail.com' };
    st['archivos/c1'] = { liberacionId: 'e1', tipo: 'csv', nombre: 'puntos.csv', tam: 5000, datos: 'P,N,E,Z', creadoPor: 'operario@gmail.com' };
    st['usuarios/operario@gmail.com'] = { nombre: 'Pedro Operario', rol: 'operario', topografoId: 'GN', activo: true };
    st['usuarios/gabinete@gmail.com'] = { nombre: 'Gabinete Prueba', rol: 'gabinete', activo: true };
    st['usuarios/jefe@gmail.com'] = { nombre: 'Jefe Prueba', rol: 'jefe', activo: true };
    localStorage.setItem('__fakeDB', JSON.stringify(st)); localStorage.setItem('__fakeUser', JSON.stringify(u)); localStorage.setItem('lib.panelSub', JSON.stringify('pp-oeste'));
  }, [ADMIN, {
    a1: reg({ pkInicio: 100, pkFin: 140 }),
    a2: reg({ pkInicio: 300, pkFin: 340, capa: 'Capa 12', descripcion: 'Liberación de relleno filtro 1 capa 12' }),
    e1: reg({ pkInicio: 500, pkFin: 540, estado: 'EC', numero: 'SKT-TOP-02000', nombreLiberacion: 'Liberación entregada', fechaLiberacion: { __ts: ahora - 400 * dia }, fechaEntrega: { __ts: ahora - 390 * dia }, fechaCampo: { __ts: ahora - 400 * dia }, creadoEn: { __ts: ahora - 400 * dia },
      archivos: [{ id: 'f1', tipo: 'foto', nombre: 'foto.jpg', tam: 200000 }, { id: 'c1', tipo: 'csv', nombre: 'puntos.csv', tam: 5000, lineas: 1 }] }),
    r1: reg({ pkInicio: 600, pkFin: 620, estado: 'RE', notaRechazo: 'Duplicado', fechaCampo: { __ts: ahora - 2 * 3600e3 } }),
  }]);
  await p.reload(); await p.waitForSelector('#nav button');
  await p.waitForFunction(() => Object.keys(window.__fakeStore()).some(k => k.startsWith('resumen/')), null, { timeout: 30000 });

  // 1. Ficha en 1100 px: se abre encima (con fondo) y no aprieta la tabla
  await p.click('[data-v="todos"]'); await p.waitForSelector('.rtab tr[data-id="a1"]');
  await p.click('.rtab tr[data-id="a1"] td:nth-child(4)'); await p.waitForSelector('#sheet.on'); await p.waitForTimeout(400);
  const vw = await p.$eval('#view', v => parseFloat(getComputedStyle(v).marginRight));
  ok(vw === 0, 'en 1100 px la ficha no empuja el contenido');
  ok(await p.$eval('#scrim', s => !s.hidden && getComputedStyle(s).display !== 'none'), 'y se abre con fondo encima de la tabla');
  await p.screenshot({ path: OUT + '/01-ficha-1100.png' });
  // 2. Cambiar de pantalla con la ficha abierta y volver con «atrás»
  await p.mouse.click(400, 500); await p.waitForTimeout(400);
  ok(await p.$eval('#sheet', s => s.hidden), 'tocar el fondo cierra la ficha');
  await p.click('.rtab tr[data-id="a1"] td:nth-child(4)'); await p.waitForSelector('#sheet.on');
  await p.click('[data-v="panel"]'); await p.waitForTimeout(400);
  ok(await p.$eval('#sheet', s => s.hidden), 'ir a otra pantalla cierra la ficha');
  await p.goBack(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => location.hash) === '#todos' && await p.$('.rtab'), 'un solo «atrás» vuelve a Registros');
  // 3. Buscar por capa y por estado
  await p.fill('#q', 'capa 12'); await p.waitForTimeout(200);
  ok(await p.$$eval('.rtab tbody tr', t => t.length) === 1, 'buscar «capa 12» encuentra 1 registro');
  await p.fill('#q', 'rechazado'); await p.waitForTimeout(200);
  ok(await p.$$eval('.rtab tbody tr', t => t.length) === 1, 'buscar «rechazado» encuentra el rechazado');
  await p.fill('#q', ''); await p.waitForTimeout(150);
  // 4. Aceptar sin señal
  await p.click('[data-v="bandeja"]'); await p.waitForSelector('.btab tr[data-rid="a1"]');
  await ctx.setOffline(true);
  await p.click('.btab tr[data-rid="a1"] [data-a="aceptar"]'); await p.waitForTimeout(300);
  ok(!(await p.$('.dlg')) && (await p.textContent('#toast')).includes('Se necesita señal'), 'aceptar sin señal avisa y no intenta generar el código');
  await ctx.setOffline(false); await p.waitForTimeout(300);
  // 5. Avance diario con la columna de rechazados
  await p.click('[data-v="ajustes"]'); await p.click('[data-tab="exportar"]'); await p.waitForSelector('#xDia');
  await p.click('[data-r="semana"]'); const dl = p.waitForEvent('download'); await p.click('#xDia'); const f = await dl;
  const csv = fs.readFileSync(await f.path(), 'utf8');
  ok(csv.split('\r\n')[0].includes('Rechazadas') && /Capa 11,1,40,0,0,1,1/.test(csv), 'avance diario: el rechazado va en su columna y no suma metros');
  // 6. Depuración de fotos (administrador)
  await p.click('[data-tab="archivos"]'); await p.waitForSelector('#arCalc'); await p.click('#arCalc'); await p.waitForSelector('#arBorrar');
  ok((await p.textContent('#ajBody')).includes('1 fotos') || (await p.textContent('#ajBody')).includes('1 foto'), 'espacio usado: 1 foto y 1 CSV');
  ok(/1<\/b> foto de <b>1<\/b> registros|<b>1<\/b> foto de <b>1<\/b>/.test(await p.innerHTML('#ajBody')), 'vista previa: 1 foto de 1 registro entregado hace más de 6 meses');
  await p.screenshot({ path: OUT + '/02-archivos.png' });
  await p.click('#arBorrar'); await aceptarDlg(p); await p.waitForTimeout(500);
  let st = await store(p);
  ok(!st['archivos/f1'] && st['archivos/c1'], 'se borra la foto y el CSV se queda');
  ok(st['liberaciones/e1'].archivos[0].purgado === true && !st['liberaciones/e1'].archivos[1].purgado, 'el registro marca la foto como depurada');
  await p.click('[data-v="todos"]'); await p.click('.chip[data-st="EC"]'); await p.waitForSelector('.rtab tr[data-id="e1"]'); await p.click('.rtab tr[data-id="e1"] td:nth-child(4)'); await p.waitForSelector('#sheet.on');
  ok((await p.textContent('#sheet')).includes('Foto depurada'), 'la ficha dice «Foto depurada»');
  await p.click('#fCerrar'); await p.waitForTimeout(400);

  // 7. Gabinete corrige un entregado: pide motivo
  await entrarComo(p, GAB); await p.click('[data-v="todos"]'); await p.click('.chip[data-st="EC"]'); await p.waitForSelector('.rtab tr[data-id="e1"]');
  await p.click('.rtab tr[data-id="e1"] td:nth-child(4)'); await p.waitForSelector('#sheet.on #fEditar'); await p.click('#fEditar'); await p.waitForSelector('#fLib');
  await p.fill('#iObs', 'Se corrige la cota'); await p.click('#bGuardar'); await p.waitForSelector('.dlg.on #dMotEC');
  ok(true, 'gabinete: editar un entregado pide el motivo');
  await p.waitForTimeout(250); await p.click('.dlg.on [type=submit]'); await p.waitForTimeout(200);
  ok(await p.$('.dlg.on #dMotEC'), 'sin motivo no guarda');
  await p.fill('.dlg.on #dMotEC', 'Calidad pidió corregir la cota'); await p.click('.dlg.on [type=submit]'); await p.waitForTimeout(600);
  st = await store(p);
  ok(st['liberaciones/e1'].motivoEdicion === 'Calidad pidió corregir la cota' && st['liberaciones/e1'].observaciones === 'Se corrige la cota' && st['liberaciones/e1'].estado === 'EC', 'guardado con su motivo y sigue entregado');
  ok(st['liberaciones/e1'].archivos[0].purgado === true, 'editar no pierde la marca de foto depurada');
  ok(Object.values(st).some(h => h && h.liberacionId === 'e1' && /Edición de entregado: Calidad pidió/.test(h.nota || '')), 'el motivo queda en el historial');

  // 8. Superposición: el operario registra un tramo que se cruza con 0+100 – 0+140 de la misma capa
  await entrarComo(p, OPER); await p.click('[data-v="nueva"]'); await p.waitForSelector('#fLib:not([hidden])');
  await p.selectOption('#iTopo', 'GN'); await p.selectOption('#iEst', 'pp'); await p.selectOption('#iSub', 'pp-oeste'); await p.selectOption('#iEle', 'mt'); await p.selectOption('#iTipo', 'filtro1');
  await p.waitForTimeout(300);
  await p.fill('#iPk1', '0+120'); await p.fill('#iPk2', '0+160'); await p.fill('#iCapa', 'capa 11'); await p.fill('#iDesc', 'Tramo que se cruza');
  await p.click('#bGuardar'); await p.waitForSelector('.dlg.on .solist');
  ok((await p.textContent('.dlg.on')).includes('0+100 – 0+140'), 'avisa: se superpone con 0+100 – 0+140');
  await p.screenshot({ path: OUT + '/03-superpone.png' });
  await p.waitForTimeout(250); await p.click('.dlg.on [type=submit]'); await p.waitForTimeout(500);
  st = await store(p);
  const nuevo = Object.entries(st).find(([k, v]) => k.startsWith('liberaciones/') && v.descripcion === 'Tramo que se cruza');
  ok(nuevo && nuevo[1].solapaCon.includes('a1'), '«Guardar igual» lo guarda marcado');
  // Otra capa: no avisa
  await p.fill('#iPk1', '0+120'); await p.fill('#iPk2', '0+160'); await p.fill('#iCapa', 'Capa 13'); await p.fill('#iDesc', 'Otra capa');
  await p.click('#bGuardar'); await p.waitForTimeout(500);
  ok(!(await p.$('.dlg.on .solist')) && Object.values(await store(p)).some(v => v && v.descripcion === 'Otra capa'), 'en otra capa no avisa');
  // Gabinete lo ve marcado
  await entrarComo(p, GAB); await p.click('[data-v="bandeja"]'); await p.waitForSelector(`.btab tr[data-rid="${nuevo[0].split('/')[1]}"]`);
  ok((await p.textContent(`.btab tr[data-rid="${nuevo[0].split('/')[1]}"]`)).includes('Se superpone'), 'gabinete lo ve con la etiqueta «Se superpone»');
  await p.click(`.btab tr[data-rid="${nuevo[0].split('/')[1]}"] td:nth-child(4)`); await p.waitForSelector('#sheet.on [data-abrir]');
  ok(true, 'la ficha enlaza el registro con el que se cruza');
  await p.screenshot({ path: OUT + '/04-bandeja-superpone.png' });
  await p.click('#sheet [data-abrir]'); await p.waitForTimeout(500);
  ok((await p.textContent('#sheet')).includes('0+100'), 'tocar el enlace abre ese registro');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);

  // 9. Jefe: Modelo 2D
  await entrarComo(p, JEFE); await p.click('[data-v="panel"]'); await p.waitForSelector('[data-vista="modelo"]');
  await p.click('[data-vista="modelo"]'); await p.waitForSelector('#mFile', { state: 'attached' });
  ok(true, 'el jefe ve el Modelo 2D y puede subir XML');

  console.log('Errores:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
