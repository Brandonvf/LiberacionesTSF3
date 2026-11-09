// Ronda 2 de mejoras (versión 19): bandeja que cabe en computadora, perfil legible en celular, avisos de datos,
// equipo «Dron» que no se arrastra, ejemplos con «Ej.:», nombres cortos de actividad y «N/A» que no es capa
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'capturas', 'prueba24'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const OPE = { uid: 'o1', email: 'operario@gmail.com', displayName: 'Pedro Operario' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
}
const escuchar = (p, n) => { p.on('pageerror', e => { errores.push(n + ': ' + e.message); console.log('PAGEERROR', n, e.message); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts/.test(m.text())) { errores.push(n + ': ' + m.text()); console.log('CONSOLE', n, m.text()); } }); };
const H = h => ({ __ts: Date.now() - h * 3600e3 });
let k = 0;
const reg = u => ({ actividad: 'LIB', estado: 'EC', numero: 'SKT-TOP-0' + (1000 + ++k), creadoPor: OPE.email, origen: 'app', estructuraId: 'pan', subestructuraId: 'pan', elementoId: 'mt', tipoId: 'filtro1', topografoId: 'GN', equipo: 'ET', descripcion: 'Registro ' + k, capa: '', fechaCampo: H(30 + k), creadoEn: H(30 + k), archivos: [], pkInicio: 0, pkFin: 40, ...u });
// Presa Auxiliar Norte (PK 0+000 a 0+400): 8 capas de filtro 1 y 7 de filtro 2, más datos para corregir
const DB = {
  'usuarios/operario@gmail.com': { nombre: 'Pedro Operario', rol: 'operario', topografoId: 'GN', activo: true }
};
for (let c = 1; c <= 8; c++) DB['liberaciones/f1c' + c] = reg({ capa: 'Capa ' + c, pkInicio: 0, pkFin: 40 * c });
for (let c = 1; c <= 7; c++) DB['liberaciones/f2c' + c] = reg({ tipoId: 'filtro2', capa: 'Capa ' + c, pkInicio: 100, pkFin: 100 + 30 * c });
Object.assign(DB, {
  'liberaciones/sp1': reg({ descripcion: 'Sin progresiva 1', pkInicio: null, pkFin: null, capa: 'Capa 2' }),
  'liberaciones/sp2': reg({ descripcion: 'Sin progresiva 2', pkInicio: null, pkFin: null, capa: 'Capa 3' }),
  'liberaciones/fu1': reg({ descripcion: 'Fuera del rango', pkInicio: 500, pkFin: 520, capa: 'Capa 4' }),
  'liberaciones/ot1': reg({ tipoId: 'roca', descripcion: 'Zona de roca que no se dibuja', pkInicio: 50, pkFin: 60 }),
  'liberaciones/na1': reg({ estado: 'PT', numero: '', tipoId: 'fundacion', capa: 'N/A', pkInicio: 200, pkFin: 240, descripcion: 'Fundación con capa N/A escrita en campo' }),
  // Bandeja: nombres largos para probar que la tabla cabe
  'liberaciones/pt1': reg({ estado: 'PT', numero: '', estructuraId: 'acc', subestructuraId: 'acc-corona-geo', tipoId: 'desp-geomembrana', capa: 'Capa 12', pkInicio: 1200, pkFin: 1290, descripcion: 'Liberación de despliegue de geomembrana capa 12 Acceso a corona geomembrana con anclaje' }),
  'liberaciones/ob1': reg({ estado: 'OB', numero: '', notaObservacion: 'Falta el CSV del levantamiento', capa: 'Capa 9', pkInicio: 300, pkFin: 340 }),
  'liberaciones/ep1': reg({ estado: 'EP', numero: 'SKT-TOP-02701', capa: 'Capa 9', pkInicio: 340, pkFin: 380, nombreLiberacion: 'Liberación de relleno filtro 1 capa 9 Presa Auxiliar Norte' }),
  'liberaciones/as1': reg({ actividad: 'ASP', estado: 'NA', numero: '', tipoId: '', capa: '', pkInicio: null, pkFin: null, descripcion: 'Aspas para vuelo de dron zona norte de la presa auxiliar' }),
  'liberaciones/lv1': reg({ actividad: 'LEV', estado: 'NA', numero: '', tipoId: '', capa: '', pkInicio: null, pkFin: null, descripcion: 'Levantamiento topográfico de plataforma de trabajo norte' })
});
async function abrir(b, u, disp) {
  const ctx = await b.newContext(disp); await preparar(ctx);
  const p = await ctx.newPage(); escuchar(p, u.uid + (disp.viewport ? disp.viewport.width : ''));
  await p.goto(URL); await p.evaluate(([db, a]) => { localStorage.clear(); localStorage.setItem('__fakeDB', JSON.stringify(db)); localStorage.setItem('__fakeUser', JSON.stringify(a)); localStorage.setItem('lib.panelSub', JSON.stringify('pan')); }, [DB, ADMIN]);
  await p.reload(); await p.waitForSelector('#nav button'); await p.waitForTimeout(700);
  if (u !== ADMIN) { await p.evaluate(u => localStorage.setItem('__fakeUser', JSON.stringify(u)), u); await p.reload(); await p.waitForSelector('#nav button'); await p.waitForTimeout(500); }
  return [ctx, p];
}
const CEL = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const cabe = p => p.evaluate(() => { const w = document.querySelector('.twrap'), t = w && w.querySelector('table'); if (!t) return { ok: false, msg: 'sin tabla' };
  const wr = w.getBoundingClientRect(), mas = [...t.querySelectorAll('tbody [data-mas]')];
  return { ok: t.scrollWidth <= w.clientWidth && mas.every(m => m.getBoundingClientRect().right <= wr.right + 0.5), msg: `${t.scrollWidth} en ${w.clientWidth}, ${mas.length} «⋯»` }; });

(async () => {
  const b = await chromium.launch();
  let ctx, p;

  // ===== R1 · Bandeja y Registros caben a 1024 y 1366 px =====
  for (const ancho of [1024, 1366]) {
    [ctx, p] = await abrir(b, ADMIN, { viewport: { width: ancho, height: 860 } });
    await p.click('#nav [data-v="bandeja"]'); await p.waitForTimeout(400);
    for (const t of ['PT', 'OB', 'EP', 'ASP', 'LEV']) {
      await p.click(`[data-bt="${t}"]`); await p.waitForTimeout(300);
      const r = await cabe(p); ok(r.ok, `R1: ${ancho} px · bandeja ${t}: la tabla cabe y el «⋯» se ve (${r.msg})`);
      if (ancho === 1024 && t === 'PT') await p.screenshot({ path: path.join(OUT, '1-bandeja-1024.png') });
    }
    await p.click('[data-bt="PT"]'); await p.waitForTimeout(250);
    const heads = await p.$$eval('#blist thead th', t => t.map(x => x.textContent.trim()));
    ok(!heads.includes('Estado') && !heads.includes('Código') && heads.includes('Liberación'), 'R1: en «Por aceptar» no hay columnas Estado ni Código: ' + heads.join(' | '));
    const fila = await p.$eval('#blist tr[data-rid="pt1"]', tr => ({ acc: [...tr.querySelectorAll('.bact button')].map(b => b.textContent.trim()), tq: tr.querySelector('.tq')?.textContent, fr: tr.querySelector('.tfr')?.getAttribute('title') }));
    ok(fila.acc.join() === 'Aceptar,⋯' && /^\d\d\/\d\d \d\d:\d\d · G\. Navarro$/.test(fila.tq) && fila.fr === 'Acceso a corona geomembrana', `R1: fila con solo «Aceptar» y «⋯», y «fecha · topógrafo» en la línea pequeña (${fila.acc.join(' ')} · ${fila.tq})`);
    ok(await p.$eval('#blist [data-a="aceptar"]', b => b.title === 'Aceptar y generar código' && b.getAttribute('aria-label') === 'Aceptar y generar código'), 'R1: el texto largo va en title y aria-label');
    ok((await p.textContent('#view .nota-g')).includes('Usa ⋯ o el clic derecho para ver todas las acciones.'), 'R1: nota nueva bajo la tabla');
    await p.click('#nav [data-v="todos"]'); await p.waitForTimeout(500);
    const r = await cabe(p); ok(r.ok, `R1: ${ancho} px · Registros cabe (${r.msg})`);
    if (ancho === 1024) await p.screenshot({ path: path.join(OUT, '2-registros-1024.png') });
    await ctx.close();
  }
  // Acciones en el «⋯», también en «Por entregar»
  [ctx, p] = await abrir(b, ADMIN, { viewport: { width: 1366, height: 860 } });
  await p.click('#nav [data-v="bandeja"]'); await p.waitForTimeout(300);
  const menu = async (tab, id) => { await p.click(`[data-bt="${tab}"]`); await p.waitForTimeout(250); await p.click(`#blist tr[data-rid="${id}"] [data-mas]`); await p.waitForSelector('#ctx'); const t = await p.$$eval('#ctx .ctx-i', x => x.map(e => e.textContent.trim())); await p.keyboard.press('Escape'); await p.waitForTimeout(250); return t; };
  let m = await menu('PT', 'pt1'); ok(['Observar', 'Rechazar', 'Editar'].every(x => m.includes(x)), 'R1: «⋯» en Por aceptar tiene Observar, Rechazar y Editar: ' + m.join(' | '));
  m = await menu('OB', 'ob1'); ok(['Rechazar', 'Devolver a pendientes'].every(x => m.includes(x)), 'R1: «⋯» en Observadas tiene Rechazar y Devolver a pendientes');
  m = await menu('EP', 'ep1'); ok(['Entregar a Calidad', 'Observar', 'Devolver a pendientes'].every(x => m.includes(x)), 'R1: «⋯» en Por entregar tiene también Observar: ' + m.join(' | '));
  m = await menu('LEV', 'lv1'); ok(m.includes('Marcar enterado'), 'R1: «⋯» en Levantamientos tiene «Marcar enterado»');
  // R7 en la bandeja
  await p.click('[data-bt="PT"]'); await p.waitForTimeout(250);
  ok((await p.$eval('#blist tr[data-rid="na1"] .tdesc b', x => x.textContent.trim())) === 'Fundación', 'R7: «Fundación · N/A» se muestra como «Fundación»');
  await ctx.close();

  // ===== R2 · Perfil en celular (375 px) =====
  [ctx, p] = await abrir(b, ADMIN, CEL);
  await p.click('#nav [data-v="panel"]'); await p.waitForTimeout(400); await p.click('[data-vista="perfil"]'); await p.waitForSelector('#chart .ojo');
  const capasPorTipo = () => p.$$eval('#chart text.lab2', t => t.map(x => [...x.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('')));
  const vis1 = await capasPorTipo();
  ok(vis1.filter(x => /^Capa/.test(x)).length === 10, `R2: muestra las últimas 5 capas de cada tipo (${vis1.length} filas: ${vis1.join(', ')})`);
  ok(vis1.join() === 'Capa 7,Capa 6,Capa 5,Capa 4,Capa 3,Capa 9,Capa 8,Capa 7,Capa 6,Capa 5,Fundación', 'R2: son las más recientes de cada tipo (filtro 2: 3 a 7; filtro 1: 5 a 9) y la banda sin capa sigue');
  const ancho = await p.$eval('#chart rect.pista', r => r.getBoundingClientRect().width);
  ok(ancho >= 280, `R2: la franja mide ${Math.round(ancho)} px (antes 133)`);
  ok(await p.$eval('#chart text.lab2', t => getComputedStyle(t).fontSize === '13px'), 'R2: nombre en 13 px arriba de la franja');
  ok(/Se ven las últimas 5 capas de cada tipo/.test(await p.textContent('#pUlt')), 'R2: avisa «Se ven las últimas 5 capas de cada tipo · Ver todas»');
  await p.screenshot({ path: path.join(OUT, '3-perfil-celular.png') });
  await p.click('#pVerTodas'); await p.waitForTimeout(400);
  const vis2 = await capasPorTipo();
  ok(vis2.filter(x => /^Capa/.test(x)).length === 16 && !(await p.textContent('#pUlt')).trim(), `R2: «Ver todas» muestra las ${vis2.filter(x => /^Capa/.test(x)).length} capas`);
  await p.reload(); await p.waitForSelector('#nav button'); await p.click('#nav [data-v="panel"]'); await p.waitForTimeout(400); await p.click('[data-vista="perfil"]'); await p.waitForSelector('#chart .ojo');
  ok((await capasPorTipo()).filter(x => /^Capa/.test(x)).length === 16, 'R2: la elección se recuerda en ese frente');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'R2: sin desplazamiento horizontal');
  // R7 en el perfil: la capa «N/A» no crea una banda
  ok(!(await capasPorTipo()).some(x => /N\/A/.test(x)), 'R7: «N/A» no crea una capa en el perfil');
  // R3: recuadro de avisos (administrador)
  const av = await p.textContent('#pAvisos');
  ok(/2 registros sin progresiva/.test(av) && /1 fuera del rango 0\+000 a 0\+400/.test(av) && /1 de tipos que no se dibujan/.test(av), 'R3: el administrador ve el recuadro: ' + av.replace(/\s+/g, ' ').trim());
  ok(!/sin progresiva/.test(await p.textContent('#pNota')), 'R3: la nota ya no repite esos avisos');
  await p.screenshot({ path: path.join(OUT, '4-avisos.png') });
  await p.click('#pAvisos [data-prob="sinPk"]'); await p.waitForSelector('.dlg.on .pfila');
  ok((await p.$$eval('.dlg.on .pfila', x => x.map(e => e.dataset.id))).sort().join() === 'sp1,sp2', 'R3: «Ver» lista los 2 sin progresiva');
  await p.click('.dlg.on .pfila[data-id="sp1"]'); await p.waitForSelector('#sheet.on');
  ok((await p.textContent('#sheet')).includes('Sin progresiva 1'), 'R3: al tocar uno se abre su ficha');
  await p.click('.sheet-x'); await p.waitForTimeout(300);
  await p.click('#pAvisos [data-prob="fuera"]'); await p.waitForSelector('.dlg.on .pfila');
  ok((await p.$$eval('.dlg.on .pfila', x => x.map(e => e.dataset.id))).join() === 'fu1' && await p.$('.dlg.on #dRango'), 'R3: «Ver» de fuera de rango lista el correcto y ofrece «Ajustar el rango»');
  await p.click('.dlg.on #dRango'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => location.hash) === '#ajustes' && await p.$('[data-tab="lugares"][aria-pressed="true"], [data-tab="lugares"].on, [data-tab="lugares"][aria-selected="true"]'), 'R3: lleva a Ajustes → Lugares');
  await p.click('#nav [data-v="panel"]'); await p.waitForTimeout(400); await p.click('[data-vista="perfil"]'); await p.waitForSelector('#pAvisos .pavisos');
  await p.click('#pAvisos [data-prob="ocultar"]'); await p.waitForTimeout(300);
  ok(!(await p.$('#pAvisos .pavisos')) && /sin progresiva/.test(await p.textContent('#pNota')), 'R3: «Ocultar» lo esconde (y la nota corta vuelve)');
  await p.reload(); await p.waitForSelector('#nav button'); await p.click('#nav [data-v="panel"]'); await p.waitForTimeout(400); await p.click('[data-vista="perfil"]'); await p.waitForTimeout(500);
  ok(!(await p.$('#pAvisos .pavisos')), 'R3: sigue oculto mientras los números no cambien');
  await ctx.close();
  // Operario: sin recuadro, con la nota corta
  [ctx, p] = await abrir(b, OPE, CEL);
  await p.click('#nav [data-v="panel"]'); await p.waitForTimeout(400); await p.click('[data-vista="perfil"]'); await p.waitForSelector('#chart .ojo');
  ok(!(await p.$('#pAvisos .pavisos')) && /sin progresiva/.test(await p.textContent('#pNota')), 'R3: operarios y topógrafos no ven el recuadro; siguen con la nota corta');

  // ===== Formulario (operario, 375 px): R4, R5, R6, R7 =====
  await p.click('#nav [data-v="nueva"]'); await p.waitForSelector('#pAct');
  // R6
  const act = await p.$$eval('#pAct button', x => x.map(b => ({ t: b.textContent.trim(), h: b.getBoundingClientRect().height, sw: b.scrollWidth <= b.clientWidth, title: b.title })));
  ok(act.map(a => a.t).join() === 'Liberación,Levantamiento,Dron,Aspas' && act.every(a => a.h <= 46 && a.sw), 'R6: los cuatro botones caben en una línea: ' + act.map(a => `${a.t} (${Math.round(a.h)} px)`).join(', '));
  ok(act[2].title === 'Levantamiento con dron', 'R6: el nombre completo va en title');
  // R4
  await p.click('[data-act="DRN"]'); await p.waitForTimeout(150);
  ok((await p.textContent('.view-title')).trim() === 'Nuevo levantamiento con dron', 'R6: el título sigue con el nombre completo');
  await p.click('[data-act="LIB"]'); await p.waitForTimeout(150);
  ok(await p.inputValue('#fEquipo [name="equipo"]') === '' && !(await p.$('#fEquipo [aria-pressed="true"]')), 'R4: al pasar de dron a liberación el equipo queda sin marcar');
  await p.click('#bGuardar'); await p.waitForTimeout(300);
  ok((await p.textContent('#fEquipo')).includes('Marca con qué equipo se hizo'), 'R4: «Guardar» pide elegir el equipo');
  // R5
  const ph = await p.evaluate(() => ['iPk1', 'iPk2', 'iCota', 'iCapa', 'iArea'].map(id => document.getElementById(id).placeholder));
  ok(ph.every(x => x.startsWith('Ej.: ')), 'R5: los ejemplos empiezan con «Ej.:» — ' + ph.join(' | '));
  ok(await p.$eval('#iDesc', t => t.placeholder === 'Se completa al elegir el frente y qué se liberó'), 'R5: la descripción vacía no muestra un ejemplo que parezca dato');
  ok(await p.$eval('#iCapa', i => getComputedStyle(i, '::placeholder').fontStyle === 'italic'), 'R5: los ejemplos van en cursiva');
  // R7
  await p.fill('#iCapa', 'N/A'); await p.locator('#iCapa').blur(); await p.waitForTimeout(100);
  ok(await p.inputValue('#iCapa') === '', 'R7: «N/A» en la capa se borra (no se guarda como capa)');
  await p.screenshot({ path: path.join(OUT, '5-form.png') });
  await ctx.close();
  // R4: el equipo de un registro con dron no pasa al formulario siguiente
  [ctx, p] = await abrir(b, OPE, CEL);
  await p.evaluate(e => localStorage.setItem('lib.ultimo.' + e, JSON.stringify({ actividad: 'LIB', equipo: 'DRN', estructuraId: 'pan', subestructuraId: 'pan' })), OPE.email);
  await p.reload(); await p.waitForSelector('#nav button'); await p.click('#nav [data-v="nueva"]'); await p.waitForSelector('#pAct');
  ok(await p.inputValue('#fEquipo [name="equipo"]') === '', 'R4: si el último equipo era dron y la actividad no, el formulario empieza sin equipo');
  await ctx.close();

  await b.close();
  ok(errores.length === 0, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
})();
