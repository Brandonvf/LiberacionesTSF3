// Estilo «Cuaderno de obra»: ventanas emergentes que se cierran como uno quiera y a la medida,
// filtros del panel (acordeón en computadora, hoja con «Aplicar» en celular, chips de lo activo)
// y correcciones: búsqueda sin trabarse, hora actual en la siguiente liberación y no perder lo escrito si falla la grabación.
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const { seccion, grupo } = require('./filtros');
const OUT = path.join(__dirname, 'capturas', 'prueba14'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
}
const escuchar = (p, n) => { p.on('pageerror', e => { errores.push(n + ': ' + e.message); console.log('PAGEERROR', n, e.message); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts|permission|permisos|permissions/i.test(m.text())) { errores.push(n + ': ' + m.text()); console.log('CONSOLE', n, m.text()); } }); };
async function cargar(p) {
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'datos', 'historico-prueba.json')));
  await p.goto(URL);
  await p.evaluate(([d, u]) => { localStorage.clear(); const st = {}; d.registros.forEach(r => { const { id, ...x } = r; ['fechaCampo', 'fechaLiberacion', 'fechaEntrega'].forEach(k => { x[k] = x[k] ? { __ts: x[k] } : null; }); x.creadoEn = x.fechaCampo; x.origen = 'excel'; st['liberaciones/' + id] = x; });
    localStorage.setItem('__fakeDB', JSON.stringify(st)); localStorage.setItem('__fakeUser', JSON.stringify(u)); localStorage.setItem('lib.panelVista', JSON.stringify('perfil')); localStorage.setItem('lib.panelSub', JSON.stringify('pp-oeste')); }, [d, ADMIN]);
  await p.reload(); await p.waitForSelector('#nav button');
  await p.waitForFunction(() => Object.keys(window.__fakeStore()).some(k => k.startsWith('resumen/')), null, { timeout: 30000 });
  await p.waitForTimeout(3200);
}
const caja = async p => { await p.waitForTimeout(320); return p.$eval('.dlg.on .dlg-box', e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, bottom: r.bottom, top: r.top }; }); };
// Abre la confirmación «Limpiar formulario» (destructiva) escribiendo algo en Nueva
async function abrirLimpiar(p) { await p.click('#nav [data-v="nueva"]'); await p.fill('#iDesc', 'algo escrito'); await p.click('#bLimpiar'); await p.waitForSelector('.dlg.on'); }
// Abre un diálogo con formulario (Observar, desde la ficha de un pendiente)
async function abrirObservar(p) {
  await p.click('#nav [data-v="bandeja"]'); await p.waitForTimeout(400);
  await p.click((await p.$('#blist tr')) ? '#blist tr[data-rid] >> nth=0 >> td.tdesc' : '#blist .item[data-id] >> nth=0'); await p.waitForSelector('#sheet.on');
  await p.click('#fObservar'); await p.waitForSelector('.dlg.on textarea');
}
const cerrado = p => p.waitForSelector('.dlg', { state: 'detached', timeout: 3000 }).then(() => true, () => false);

(async () => {
  const b = await chromium.launch();
  const nuevo = (id, extra) => ({ actividad: 'LIB', estado: 'PT', numero: '', creadoPor: ADMIN.email, origen: 'app', estructuraId: 'pp', subestructuraId: 'pp-oeste', elementoId: 'mt', tipoId: 'filtro1', capa: 'Capa 11', topografoId: 'GN', descripcion: 'Liberación de prueba ' + id, fechaCampo: { __ts: Date.now() - 3600e3 }, creadoEn: { __ts: Date.now() - 3600e3 }, archivos: [], ...extra });

  for (const [nom, opts] of [['pc', { viewport: { width: 1440, height: 900 } }], ['cel', { ...devices['iPhone 13'] }]]) {
    const ctx = await b.newContext(opts); await preparar(ctx);
    const p = await ctx.newPage(); escuchar(p, nom);
    await cargar(p);
    await p.evaluate(([n1, n2]) => { const st = JSON.parse(localStorage.getItem('__fakeDB')); st['liberaciones/n1'] = n1; st['liberaciones/n2'] = n2; localStorage.setItem('__fakeDB', JSON.stringify(st)); }, [nuevo('n1', { pkInicio: 100, pkFin: 140 }), nuevo('n2', { pkInicio: 140, pkFin: 170 })]);
    await p.reload(); await p.waitForSelector('#nav button'); await p.waitForTimeout(800);
    const T = nom === 'pc' ? 'computadora' : 'celular';

    // ---- 1. Ventanas emergentes
    await abrirLimpiar(p);
    ok(await p.$('.dlg.on .dlg-x'), `${T}: la confirmación tiene ✕ para cerrar`);
    const c1 = await caja(p), vh = await p.evaluate(() => innerHeight), vw = await p.evaluate(() => innerWidth);
    if (nom === 'pc') ok(c1.w <= 361 && c1.h < 260, `${T}: confirmación corta y angosta (${Math.round(c1.w)} × ${Math.round(c1.h)} px)`);
    else ok(Math.abs(c1.bottom - vh) < 2 && c1.w >= vw - 1 && c1.h < vh * 0.45, `${T}: confirmación como hoja desde abajo, baja (${Math.round(c1.h)} px de ${vh})`);
    ok(await p.$eval('.dlg.on [type=submit]', b => b.textContent.trim()) === 'Limpiar', `${T}: el botón dice la acción («Limpiar»), no «Aceptar»`);
    await p.screenshot({ path: path.join(OUT, `${nom}-1-confirmacion.png`) });
    // Destructiva: tocar fuera no la cierra
    await p.mouse.click(5, nom === 'pc' ? 5 : 120); await p.waitForTimeout(300);
    ok(await p.$('.dlg.on'), `${T}: una confirmación de borrar no se cierra tocando fuera (evita toques accidentales)`);
    await p.click('.dlg.on .dlg-x'); ok(await cerrado(p), `${T}: se cierra con la ✕`);
    ok(await p.inputValue('#iDesc') === 'algo escrito', `${T}: al cerrar con ✕ no se borra nada`);
    await p.click('#bLimpiar'); await p.waitForSelector('.dlg.on'); await p.keyboard.press('Escape');
    ok(await cerrado(p), `${T}: se cierra con Escape`);
    await p.click('#bLimpiar'); await p.waitForSelector('.dlg.on'); await p.goBack();
    ok(await cerrado(p), `${T}: se cierra con «Atrás» del celular o del navegador`);
    ok(await p.$('#fLib') && (await p.evaluate(() => location.hash)) === '#nueva', `${T}: «Atrás» solo cierra la ventana, no cambia de pantalla`);
    await p.click('#bLimpiar'); await p.waitForSelector('.dlg.on'); await p.click('.dlg.on [type=submit]'); await cerrado(p);
    ok(await p.inputValue('#iDesc') === '', `${T}: la acción principal sí limpia`);

    // Diálogo con formulario: tocar fuera sí lo cierra; Atrás cierra el diálogo pero deja la ficha
    await abrirObservar(p);
    const c2 = await caja(p);
    if (nom === 'pc') ok(c2.w > 361 && c2.w <= 481, `${T}: formulario corto de ancho medio (${Math.round(c2.w)} px)`);
    else ok(Math.abs(c2.bottom - vh) < 2 && c2.h <= vh * 0.86, `${T}: formulario como hoja sin tapar toda la pantalla (${Math.round(c2.h)} de ${vh} px)`);
    await p.screenshot({ path: path.join(OUT, `${nom}-2-formulario.png`) });
    await p.goBack(); ok(await cerrado(p), `${T}: «Atrás» cierra primero el diálogo…`);
    ok(await p.$('#sheet.on'), `${T}: …y deja la ficha abierta`);
    await p.click('#fObservar'); await p.waitForSelector('.dlg.on textarea');
    const box = await caja(p);
    await p.mouse.click(nom === 'pc' ? 20 : vw / 2, Math.min(40, box.top - 20));
    ok(await cerrado(p), `${T}: un formulario se cierra tocando fuera`);
    ok(await p.$('.sheet-x'), `${T}: la ficha tiene ✕ para cerrar`);
    await p.click('.sheet-x'); await p.waitForSelector('#sheet', { state: 'hidden' });
    ok(true, `${T}: la ficha se cierra con su ✕`);

    // ---- 2. Filtros del panel
    await p.click('#nav [data-v="panel"]'); await p.waitForSelector('#chart svg'); await p.waitForTimeout(600);
    if (nom === 'pc') {
      ok(await p.$('.pside #pAcc') && !(await p.$('#pFilBtn')), 'computadora: filtros en acordeón en la columna izquierda');
      const abiertas = async () => p.$$eval('#pAcc [data-acc][aria-expanded="true"]', x => x.length);
      await seccion(p, 'fil'); ok(await abiertas() === 1, 'una sección abierta a la vez (Filtros)');
      await seccion(p, 'pk'); ok(await abiertas() === 1 && !(await p.$('#pDesde')), 'al abrir Progresiva se pliega Filtros');
      ok(/Todo el frente/.test(await p.textContent('[data-acc="pk"]')) && /Sin filtros/.test(await p.textContent('[data-acc="fil"]')), 'cada sección cerrada muestra su resumen');
      await seccion(p, 'cap');
      const totalG = await p.$$eval('#pCapChips .cgrp', g => g.length);
      ok(await p.$$eval('#pCapChips .cchips[hidden]', g => g.length) > 0, 'con muchas capas los grupos empiezan plegados');
      await p.fill('#pCapQ', 'filtro 1'); await p.waitForTimeout(200);
      const g1 = await p.$$eval('#pCapChips .cgrp', g => g.map(x => x.querySelector('.cgrp-t').textContent));
      ok(g1.length === 1 && g1[0] === 'Relleno filtro 1' && totalG > 5, `el buscador deja solo lo que coincide (${g1.join(', ')})`);
      await p.fill('#pCapQ', 'capa 3'); await p.waitForTimeout(200);
      ok(await p.$$eval('#pCapChips .cchip', c => c.length > 0 && c.every(x => /capa 3/i.test(x.textContent))), 'buscar «capa 3» muestra esas capas dentro de sus grupos');
      await p.fill('#pCapQ', ''); await p.waitForTimeout(150);
      await grupo(p, 'masivo'); await p.click('[data-key="masivo|Capa 3"]'); await p.waitForTimeout(300);
      ok(/Capas \d+ de \d+/.test(await p.textContent('#pActivos')), 'ocultar una capa aparece como chip encima del gráfico');
      await seccion(p, 'fil'); await p.click('[data-st="EC"]'); await p.waitForTimeout(300);
      ok(/Entregado a Calidad/.test(await p.textContent('#pActivos')) && /Entregado a Calidad/.test(await p.textContent('[data-acc="fil"]')), 'el estado elegido se aplica al instante y sale en el resumen y en los chips');
      await p.screenshot({ path: path.join(OUT, `${nom}-3-filtros.png`) });
      await p.click('#pActivos [data-quitar="st"]'); await p.waitForTimeout(300);
      ok(!/Entregado/.test(await p.textContent('#pActivos')), 'la ✕ del chip quita ese filtro');
      await p.click('#pActivos [data-quitar="capas"]'); await p.waitForTimeout(300);
      ok(await p.$eval('#pActivos', e => e.hidden), 'sin filtros no quedan chips');
      await p.reload(); await p.waitForSelector('#nav button'); await p.click('#nav [data-v="panel"]'); await p.waitForSelector('#pAcc');
      ok(await p.$eval('[data-acc="fil"]', b => b.getAttribute('aria-expanded')) === 'true', 'recuerda qué sección quedó abierta');
    } else {
      ok(await p.$('#pFilBtn') && !(await p.$('#pAcc')) && !(await p.$('#pPk1')), 'celular: un solo renglón «Filtros», todo plegado');
      ok(/Capas \d+ de \d+/.test(await p.textContent('#pFilBtn')), 'el renglón dice cuántas capas se ven');
      await p.screenshot({ path: path.join(OUT, `${nom}-3-panel.png`) });
      await p.click('#pFilBtn'); await p.waitForSelector('.dlg-fil.on'); await p.waitForTimeout(300);
      const c3 = await caja(p);
      ok(Math.abs(c3.bottom - vh) < 2, 'los filtros se abren en una hoja desde abajo');
      ok(await p.evaluate(() => document.activeElement?.id !== 'pCapQ'), 'no salta el teclado al abrir');
      await p.screenshot({ path: path.join(OUT, `${nom}-4-hoja.png`) });
      await seccion(p, 'fil'); await p.click('[data-st="EC"]'); await p.waitForTimeout(200);
      ok(!/Entregado/.test(await p.$eval('#pActivos', e => e.textContent)), 'en el celular no se aplica hasta tocar «Aplicar»');
      await p.click('.dlg-fil [type=submit]'); await cerrado(p); await p.waitForTimeout(300);
      ok(/Entregado a Calidad/.test(await p.textContent('#pActivos')) && /1 filtro/.test(await p.textContent('#pFilBtn')), 'al aplicar: chip encima del gráfico y «1 filtro» en el renglón');
      await p.click('#pFilBtn'); await p.waitForSelector('.dlg-fil.on'); await seccion(p, 'fil'); await p.click('[data-st=""]'); await p.click('.dlg-fil .dlg-x'); await cerrado(p); await p.waitForTimeout(200);
      ok(/Entregado a Calidad/.test(await p.textContent('#pActivos')), 'cerrar la hoja con ✕ descarta los cambios');
      await p.click('#pActivos [data-quitar="st"]'); await p.waitForTimeout(300);
      ok(await p.$eval('#pActivos', e => e.hidden) && /^\s*Filtros/.test(await p.textContent('#pFilBtn')), 'la ✕ del chip quita el filtro');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin desplazamiento horizontal');
    }

    // ---- 3. Correcciones
    // Búsqueda: no se redibuja con cada letra
    await p.click('#nav [data-v="todos"]'); await p.waitForSelector('#q');
    await p.evaluate(() => { window.__dib = 0; new MutationObserver(m => { if (m.some(x => [...x.addedNodes].some(n => n.id === 'lista'))) window.__dib++; }).observe(document.querySelector('#view'), { childList: true, subtree: true }); });
    await p.type('#q', 'relleno masivo', { delay: 20 }); await p.waitForTimeout(400);
    const dib = await p.evaluate(() => window.__dib);
    ok(dib <= 2, `buscar «relleno masivo» redibuja la lista ${dib} vez/veces, no 14`);
    ok(await p.inputValue('#q') === 'relleno masivo' && await p.evaluate(() => document.activeElement?.id === 'q'), 'el campo conserva lo escrito y el cursor');
    await p.fill('#q', '');

    // Siguiente liberación con la hora actual
    await p.click('#nav [data-v="nueva"]'); await p.waitForSelector('#fLib');
    const llenar = async (desc, pk = 500) => {
      await p.selectOption('#iTopo', 'GN'); await p.selectOption('#iEst', 'pp'); await p.waitForTimeout(100); await p.selectOption('#iSub', 'pp-oeste');
      await p.selectOption('#iEle', 'mt'); await p.waitForTimeout(100); await p.selectOption('#iTipo', 'filtro2');
      await p.fill('#iPk1', '2+' + pk); await p.fill('#iPk2', '2+' + (pk + 20)); await p.fill('#iDesc', desc);
    };
    await llenar('Primera de prueba'); await p.fill('#iFecha', '2026-11-01T08:00');
    await p.click('#bGuardar'); await p.waitForTimeout(600);
    const fecha2 = await p.inputValue('#iFecha');
    ok(fecha2 !== '2026-11-01T08:00' && Math.abs(new Date(fecha2) - Date.now()) < 5 * 60e3, `la siguiente liberación toma la hora actual (${fecha2}), no la de la anterior`);

    // Si Firebase rechaza la grabación, lo escrito no se pierde
    await llenar('No debe perderse', 600); await p.fill('#iCota', '771.25');
    await p.evaluate(() => { window.__fakeNegar = true; });
    await p.click('#bGuardar'); await p.waitForTimeout(800);
    ok(await p.inputValue('#iDesc') === 'No debe perderse' && await p.inputValue('#iCota') === '771.25', 'si la grabación falla, el formulario queda tal cual');
    const tt = await p.textContent('#toast');
    ok(/No se pudo guardar/.test(tt) && !/Liberación guardada/.test(tt), `avisa el error y no dice «guardada» («${tt.trim()}»)`);
    ok(await p.$eval('#bGuardar', b => !b.disabled && b.textContent.trim() === 'Guardar liberación'), 'el botón vuelve a quedar listo para intentar de nuevo');
    await p.evaluate(() => { window.__fakeNegar = false; });
    await p.click('#bGuardar'); await p.waitForTimeout(800);
    ok(await p.evaluate(() => Object.values(window.__fakeStore()).some(x => x && x.descripcion === 'No debe perderse')), 'al reintentar se guarda');
    await ctx.close();
  }

  await b.close();
  ok(errores.length === 0, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
})();
