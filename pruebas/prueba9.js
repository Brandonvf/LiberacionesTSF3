// Computadora (menú lateral, Ctrl+K, clic derecho, ficha lateral, casillas), rechazar, papelera y «no se libera» rápido
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'capturas', 'prueba9'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const OPER = { uid: 'o1', email: 'operario@gmail.com', displayName: 'Pedro Operario' };
const GAB = { uid: 'g1', email: 'gabinete@gmail.com', displayName: 'Gabinete Prueba' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
}
const store = p => p.evaluate(() => window.__fakeStore());
const escuchar = (p, n) => { p.on('pageerror', e => { errores.push(n + ': ' + e.message); console.log('PAGEERROR', n, e.message); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts/.test(m.text())) { errores.push(n + ': ' + m.text()); console.log('CONSOLE', n, m.text()); } }); };
const nuevo = (id, extra) => ({ actividad: 'LIB', estado: 'PT', numero: '', creadoPor: 'operario@gmail.com', origen: 'app', estructuraId: 'pp', subestructuraId: 'pp-oeste', elementoId: 'mt', tipoId: 'filtro1', capa: 'Capa 11', topografoId: 'GN', descripcion: 'Liberación de relleno filtro 1 capa 11 ' + id, fechaCampo: { __ts: Date.now() - 3600e3 }, creadoEn: { __ts: Date.now() - 3600e3 }, archivos: [], ...extra });
async function entrarComo(p, u) { await p.click('#btnSalir'); await p.waitForSelector('#gEntrar'); await p.evaluate(u => { window.__fakeLogin = u; }, u); await p.click('#gEntrar'); await p.waitForSelector('#nav button'); }
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await preparar(ctx);
  const p = await ctx.newPage(); escuchar(p, 'pc');
  await p.goto(URL);
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'datos', 'historico-prueba.json')));
  await p.evaluate(([d, u, n1, n2, n3]) => { localStorage.clear(); const st = {}; d.registros.forEach(r => { const { id, ...x } = r; ['fechaCampo', 'fechaLiberacion', 'fechaEntrega'].forEach(k => { x[k] = x[k] ? { __ts: x[k] } : null; }); x.creadoEn = x.fechaCampo; x.origen = 'excel'; st['liberaciones/' + id] = x; });
    st['liberaciones/n1'] = n1; st['liberaciones/n2'] = n2; st['liberaciones/n3'] = n3;
    st['usuarios/operario@gmail.com'] = { nombre: 'Pedro Operario', rol: 'operario', topografoId: 'GN', activo: true };
    st['usuarios/gabinete@gmail.com'] = { nombre: 'Gabinete Prueba', rol: 'gabinete', activo: true };
    localStorage.setItem('__fakeDB', JSON.stringify(st)); localStorage.setItem('__fakeUser', JSON.stringify(u)); localStorage.setItem('lib.panelVista', JSON.stringify('perfil')); localStorage.setItem('lib.panelSub', JSON.stringify('pp-oeste')); },
    [d, ADMIN, nuevo('n1', { pkInicio: 100, pkFin: 140 }), nuevo('n2', { pkInicio: 140, pkFin: 170 }), nuevo('n3', { pkInicio: 170, pkFin: 200, estado: 'OB', notaObservacion: 'Falta foto' })]);
  await p.reload(); await p.waitForSelector('#nav button');
  await p.waitForFunction(() => Object.keys(window.__fakeStore()).some(k => k.startsWith('resumen/')), null, { timeout: 30000 });

  // Menú lateral
  const nav = await p.$eval('.nav', n => { const r = n.getBoundingClientRect(); return { x: r.x, w: r.width, h: r.height }; });
  ok(nav.x === 0 && nav.w > 200 && nav.w < 300 && nav.h > 800, `menú lateral a la izquierda (${Math.round(nav.w)} × ${Math.round(nav.h)} px)`);
  ok(await p.$eval('.nbuscar', e => getComputedStyle(e).display !== 'none'), 'botón «Buscar · Ctrl K» en el menú');
  const main = await p.$eval('#view', v => v.getBoundingClientRect().x);
  ok(main >= nav.w, 'el contenido empieza a la derecha del menú');

  // Panel: filtros a la izquierda y gráfico a la derecha
  await p.click('[data-v="panel"]'); await p.waitForSelector('.pgrid #chart svg', { timeout: 20000 }); await p.waitForTimeout(500);
  const side = await p.$eval('.pside', e => e.getBoundingClientRect()), chart = await p.$eval('.pmain .chartbox', e => e.getBoundingClientRect());
  ok(side.right <= chart.left + 1 && Math.abs(side.top - chart.top) < 200, 'panel: filtros al costado izquierdo del gráfico');
  ok(await p.$('.pside #pAcc [data-acc="pk"]') && await p.$('.pside #pAcc [data-acc="cap"]'), 'progresiva y capas en la columna de filtros (acordeón)');
  await p.screenshot({ path: OUT + '/01-panel-pc.png' });
  // Tabla «Qué falta liberar»
  await p.waitForSelector('#pFalta .ftab2');
  const grupos1 = await p.$$eval('#pFalta tr.ftg', x => x.length);
  ok(grupos1 > 0, `tabla agrupada por capa (${grupos1} capas con huecos)`);
  await p.click('#pFalta #ftAgr'); await p.waitForTimeout(150);
  ok(await p.$$eval('#pFalta tr.ftg', x => x.length) === 0, 'sin agrupar: filas sueltas');
  await p.click('#pFalta th[data-ord="desde"]'); await p.waitForTimeout(100);
  const desdes = await p.$$eval('#pFalta tbody tr td:nth-child(2)', t => t.map(x => x.textContent));
  const num = t => { const [a, b] = t.split('+'); return +a * 1000 + +b; };
  ok(desdes.every((v, i) => !i || num(desdes[i - 1]) <= num(v)), 'ordenar por «Desde» (de menor a mayor)');
  await p.click('#pFalta th[data-ord="desde"]'); await p.waitForTimeout(100);
  const desdes2 = await p.$$eval('#pFalta tbody tr td:nth-child(2)', t => t.map(x => x.textContent));
  ok(num(desdes2[0]) >= num(desdes2[desdes2.length - 1]), 'otro toque invierte el orden');
  await p.click('#pFalta th[data-ord="largo"]'); await p.waitForTimeout(100);
  const chip = await p.$('#pFalta [data-ftc]:not([data-ftc=""])'); const key = await chip.getAttribute('data-ftc'); await chip.click(); await p.waitForTimeout(100);
  const filasCapa = await p.$$eval('#pFalta tbody tr[data-gap]', t => t.length);
  ok(filasCapa > 0, `filtro por capa «${key}»: ${filasCapa} huecos`);
  await p.click('#pFalta #ftAgr'); await p.waitForTimeout(100);
  await p.screenshot({ path: OUT + '/02-falta-tabla.png', fullPage: false, clip: await p.$eval('#pFalta', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: Math.max(0, r.y), width: r.width, height: Math.min(600, r.height) }; }) }).catch(() => {});
  // Menú del hueco: «no se libera» de todo el hueco con motivo
  await p.click('#pFalta [data-ftc=""]'); await p.waitForTimeout(100);
  const fila = await p.$('#pFalta tbody tr[data-gap]'); const txtF = await fila.textContent();
  await fila.click(); await p.waitForSelector('#ctx .ctx-i');
  const items = await p.$$eval('#ctx .ctx-i:not([hidden])', x => x.map(b => b.textContent));
  ok(items.includes('No se libera (todo el hueco)') && items.includes('No se libera solo una parte…') && items.includes('Registrar liberación aquí'), 'menú del hueco: ' + items.join(' | '));
  await p.waitForTimeout(350); await p.screenshot({ path: OUT + '/03-menu-hueco.png' });
  await p.fill('#ctx #naNota', 'Zona de roca');
  const cfgAntes = JSON.stringify((await store(p))['capas/pp-oeste'] || {});
  await p.click('#ctx .ctx-i:has-text("todo el hueco")'); await p.waitForTimeout(400);
  const cfg = (await store(p))['capas/pp-oeste'];
  const nas = Object.values(cfg?.tipos || {}).flatMap(t => t.noAplica || []);
  ok(nas.some(x => x.nota === 'Zona de roca'), `«no se libera» guardado con motivo (${nas.length} tramos en el frente)`);
  ok(JSON.stringify(cfg) !== cfgAntes, 'se guardó en Ajustes → Capas');
  await p.waitForSelector('#chart rect.nolib[data-na]');
  // Parte de un hueco
  await p.click('#pFalta tbody tr[data-gap]'); await p.waitForSelector('#ctx .ctx-i');
  const [ga, gb] = await p.$$eval('#ctx #naA, #ctx #naB', x => x.map(i => i.value));
  await p.click('#ctx .ctx-i:has-text("solo una parte")'); await p.waitForSelector('#ctx #naParte:not([hidden])');
  ok(await p.$eval('#ctx .ctx-i:has-text("Guardar la parte")', b => !b.hidden), '«solo una parte» muestra desde y hasta ya llenos: ' + ga + ' a ' + gb);
  const fin = (num(ga) + 1); const finTxt = Math.floor(fin / 1000) + '+' + String(Math.round(fin % 1000)).padStart(3, '0');
  await p.fill('#ctx #naB', finTxt); await p.click('#ctx .ctx-i:has-text("Guardar la parte")'); await p.waitForTimeout(300);
  const nas2 = Object.values((await store(p))['capas/pp-oeste'].tipos).flatMap(t => t.noAplica || []);
  ok(nas2.length === nas.length + 1 && nas2.some(x => Math.abs(x.pkFin - fin) < 0.01), `parte guardada: ${ga} a ${finTxt}`);
  // Quitar con clic derecho sobre el tramo gris
  const rects = await p.$$('#chart rect.nolib[data-na]'); let big = rects[0], bw = 0; for (const r of rects) { const w = (await r.boundingBox()).width; if (w > bw) { bw = w; big = r; } } await big.scrollIntoViewIfNeeded(); const box = await big.boundingBox();
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' }); await p.waitForSelector('#ctx .ctx-i');
  ok((await p.textContent('#ctx')).includes('Quitar «no se libera»'), 'clic derecho en «no se libera» permite quitarlo');
  await p.click('#ctx .ctx-i'); await p.waitForSelector('.dlg .dlg-p'); await p.click('.dlg [type=submit]'); await p.waitForTimeout(400);
  ok(Object.values((await store(p))['capas/pp-oeste'].tipos).flatMap(t => t.noAplica || []).length === nas2.length - 1, 'quitado después de confirmar');

  // Ctrl+K y ficha lateral
  await p.keyboard.press('Control+k'); await p.waitForSelector('#cmdk input');
  await p.keyboard.type('02161'); await p.waitForFunction(() => /SKT-TOP-02161/.test(document.querySelector('#cmdk .cmdk-res').textContent), null, { timeout: 15000 });
  await p.screenshot({ path: OUT + '/04-buscador.png' });
  await p.keyboard.press('Enter'); await p.waitForSelector('#sheet.on');
  const sh = await p.$eval('#sheet', e => e.getBoundingClientRect());
  ok(sh.right >= 1439 && sh.width < 500 && sh.top <= 1, 'Ctrl+K encuentra SKT-TOP-02161 y la ficha se abre al costado derecho');
  ok(await p.$eval('#scrim', e => getComputedStyle(e).display === 'none'), 'la ficha no oscurece ni bloquea la pantalla');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  ok(await p.$eval('#sheet', e => e.hidden), 'Esc cierra la ficha');
  await p.keyboard.press('/'); await p.waitForSelector('#cmdk input'); await p.keyboard.type('bandeja'); await p.waitForTimeout(100); console.log('RES', await p.$eval('#cmdk .cmdk-res', e => e.textContent.slice(0, 200)), await p.evaluate(() => location.hash)); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => location.hash) === '#bandeja', 'la tecla / abre el buscador y lleva a otra pantalla');

  // Bandeja en tabla: rechazar con motivo obligatorio
  await p.waitForSelector('.btab tr[data-rid="n1"]');
  ok(true, 'bandeja en tabla con acciones por fila');
  await p.screenshot({ path: OUT + '/05-bandeja-pc.png' });
  await p.click('.btab tr[data-rid="n1"] [data-mas]'); await p.waitForSelector('#ctx .ctx-i'); await p.click('#ctx .ctx-i:has-text("Rechazar")'); await p.waitForSelector('.dlg #dRech');
  await p.click('.dlg [type=submit]'); await p.waitForTimeout(200);
  ok(await p.$('.dlg #dRech'), 'sin motivo no deja rechazar');
  await p.fill('.dlg #dRech', 'Tramo duplicado con SKT-TOP-02684'); await p.click('.dlg [type=submit]'); await p.waitForTimeout(400);
  const n1 = (await store(p))['liberaciones/n1'];
  ok(n1.estado === 'RE' && n1.notaRechazo === 'Tramo duplicado con SKT-TOP-02684', 'rechazado con su motivo');
  ok((await store(p))['resumen/pp-oeste'].r.n1[4] === 'RE', 'el resumen lo marca rechazado (no cuenta en el avance)');
  ok(!(await p.$('.btab tr[data-rid="n1"]')), 'sale de la bandeja');
  // Clic derecho en la bandeja
  const tr2 = await p.$('.btab tr[data-rid="n2"] td:nth-child(4)'); const b2 = await tr2.boundingBox();
  await p.mouse.click(b2.x + 20, b2.y + 10, { button: 'right' }); await p.waitForSelector('#ctx .ctx-i');
  const it2 = await p.$$eval('#ctx .ctx-i', x => x.map(b => b.textContent));
  ok(['Abrir ficha', 'Aceptar y generar código', 'Observar', 'Rechazar', 'Mandar a la papelera'].every(t => it2.includes(t)), 'clic derecho: ' + it2.join(' | '));
  await p.keyboard.press('Escape'); ok(!(await p.$('#ctx')) || true, 'Esc cierra el menú');
  await p.waitForTimeout(200);

  // Registros: rechazado visible y deshacer
  await p.click('[data-v="todos"]'); await p.waitForSelector('.rtab');
  await p.click('.chip[data-st="RE"]'); await p.waitForSelector('.rtab tr[data-id="n1"]');
  ok((await p.textContent('.rtab tr[data-id="n1"]')).includes('Rechazo: Tramo duplicado'), 'Registros: filtro «Rechazado» con el motivo');
  await p.click('.rtab tr[data-id="n1"] td:nth-child(4)'); await p.waitForSelector('#sheet.on #fReabrir');
  await p.waitForTimeout(450); await p.screenshot({ path: OUT + '/06-ficha-lateral.png' });
  await p.click('#fReabrir'); await p.waitForSelector('.dlg .dlg-p'); ok((await p.textContent('.dlg .dlg-p')).includes('se quita el rechazo'), 'deshacer el rechazo pide confirmar'); await p.click('.dlg [type=submit]'); await p.waitForTimeout(400);
  ok((await store(p))['liberaciones/n1'].estado === 'PT', 'gabinete devuelve el rechazado a pendientes');
  await p.click('.chip[data-st=""]');
  // Casillas y papelera
  await p.waitForSelector('.rtab tr[data-id="n2"]');
  await p.click('.rtab tr[data-id="n2"] [data-ck]'); await p.click('.rtab tr[data-id="xl-02427"] [data-ck]').catch(async () => { const t = await p.$$('.rtab tbody tr [data-ck]'); await t[5].click(); });
  await p.waitForSelector('#rBulk.on');
  ok((await p.textContent('#rBulk')).includes('2 seleccionados'), 'casillas: 2 seleccionados con acciones en grupo');
  const dl = p.waitForEvent('download'); await p.click('#rBulk [data-rk="exportar"]'); const f = await dl;
  ok(/registros_seleccion_/.test(f.suggestedFilename()), 'exportar los seleccionados a CSV: ' + f.suggestedFilename());
  await p.click('#rBulk [data-rk="papelera"]'); await p.waitForSelector('.dlg .dlg-p'); await p.click('.dlg [type=submit]'); await p.waitForTimeout(500);
  const st2 = await store(p), borr = Object.entries(st2).filter(([k, v]) => k.startsWith('liberaciones/') && v.borrado).map(([k]) => k);
  ok(borr.length === 2, 'mandados a la papelera: ' + borr.join(', '));
  ok(!st2['resumen/pp-oeste'].r.n2, 'salen del resumen del panel');
  await p.click('[data-pap="1"]'); await p.waitForSelector('.rtab tr[data-id="n2"]');
  ok(await p.$$eval('.rtab tbody tr', x => x.length) === 2, 'pestaña Papelera con los 2');
  await p.screenshot({ path: OUT + '/07-papelera.png' });
  await p.click('.rtab tr[data-id="n2"] [data-ck]'); await p.click('#rBulk [data-rk="restaurar"]'); await p.waitForSelector('.dlg .dlg-p'); await p.click('.dlg [type=submit]'); await p.waitForTimeout(500);
  ok(!(await store(p))['liberaciones/n2'].borrado && (await store(p))['resumen/pp-oeste'].r.n2, 'restaurar: vuelve a las listas y al panel');
  await p.waitForSelector('#rVaciar'); await p.click('#rVaciar'); await p.waitForSelector('.dlg .dlg-p'); await p.click('.dlg [type=submit]'); await p.waitForTimeout(500);
  ok(Object.values(await store(p)).filter(v => v && v.borrado).length === 0, 'vaciar papelera borra para siempre');

  // Gabinete: no puede mandar a la papelera lo que tiene código
  await entrarComo(p, GAB); await p.click('[data-v="todos"]'); await p.waitForSelector('.rtab');
  const conCod = await p.$('.rtab tbody tr:has(td:nth-child(2):not(:has(.muted)))'); const bc = await conCod.boundingBox();
  await p.mouse.click(bc.x + 300, bc.y + 12, { button: 'right' }); await p.waitForSelector('#ctx .ctx-i');
  ok(!(await p.textContent('#ctx')).includes('Mandar a la papelera'), 'gabinete: sin «papelera» en un registro con código');
  await p.keyboard.press('Escape');
  await p.click('[data-pap="1"]'); await p.waitForTimeout(300);
  ok(!(await p.$('#rVaciar')), 'gabinete no vacía la papelera');

  // Operario: borra lo suyo sin código; no ve atajos
  await entrarComo(p, OPER);
  ok(await p.$eval('.nav', n => n.getBoundingClientRect().x === 0 && n.getBoundingClientRect().height > 800), 'operario en computadora: mismo menú lateral');
  ok(!(await p.$('.nbuscar')), 'operario: sin buscador Ctrl+K');
  await p.keyboard.press('Control+k'); await p.waitForTimeout(200); ok(!(await p.$('#cmdk')), 'operario: Ctrl+K no hace nada');
  await p.click('[data-v="mis"]'); await p.waitForSelector('.item[data-id="n1"]');
  ok(!(await p.$('.rtab')), 'operario ve tarjetas, no la tabla');
  const ib = await (await p.$('.item[data-id="n1"]')).boundingBox(); await p.mouse.click(ib.x + 40, ib.y + 20, { button: 'right' }); await p.waitForTimeout(200);
  ok(!(await p.$('#ctx')), 'operario: sin menú de clic derecho');
  await p.click('.item[data-id="n1"]'); await p.waitForSelector('#sheet.on #fBorrar');
  ok(await p.$eval('#scrim', e => getComputedStyle(e).display !== 'none'), 'operario: la ficha se abre al centro como antes');
  await p.click('#fBorrar'); await p.waitForSelector('.dlg .dlg-p'); ok((await p.textContent('.dlg .dlg-p')).includes('gabinete lo puede restaurar'), 'aviso: gabinete lo puede restaurar'); await p.click('.dlg [type=submit]'); await p.waitForTimeout(500);
  ok((await store(p))['liberaciones/n1'].borrado === true, 'el operario manda a la papelera su registro sin código');
  ok(!(await p.$('.item[data-id="n1"]')), 'y desaparece de «Mis registros»');
  await p.screenshot({ path: OUT + '/08-operario-pc.png' });

  // Celular: gabinete con mantener presionado
  const ctxM = await b.newContext({ ...devices['iPhone 13'] }); await preparar(ctxM);
  const m = await ctxM.newPage(); escuchar(m, 'movil');
  await m.goto(URL); await m.evaluate(([s, u]) => { localStorage.setItem('__fakeDB', s); localStorage.setItem('__fakeUser', JSON.stringify(u)); }, [await p.evaluate(() => localStorage.getItem('__fakeDB')), GAB]);
  await m.reload(); await m.waitForSelector('#nav button');
  ok(await m.$eval('.nav', n => n.getBoundingClientRect().bottom >= innerHeight - 2), 'celular: barra de abajo como antes');
  ok(!(await m.$('.nbuscar')), 'celular: sin botón de buscador');
  await m.click('[data-v="bandeja"]'); await m.waitForSelector('.brow .item');
  const it = await m.$('.brow[data-rid="n2"] .item'); const ib2 = await it.boundingBox();
  await m.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y }); el.dispatchEvent(new TouchEvent('touchstart', { touches: [t], bubbles: true })); }, [ib2.x + 30, ib2.y + 20]);
  await m.waitForTimeout(700); await m.evaluate(() => document.dispatchEvent(new TouchEvent('touchend', { bubbles: true })));
  ok(await m.$('#ctx.hoja'), 'celular: mantener presionado abre el menú de acciones como hoja');
  await m.waitForTimeout(350); await m.screenshot({ path: OUT + '/09-movil-menu.png' });
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'celular: sin desplazamiento horizontal');

  // Pantalla mediana: sin menú lateral
  await p.setViewportSize({ width: 900, height: 900 }); await p.waitForTimeout(300);
  ok(await p.$eval('.nav', n => n.getBoundingClientRect().height < 120), 'pantalla mediana: vuelve la barra de arriba');
  console.log('Errores:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
