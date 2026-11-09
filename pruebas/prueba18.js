// Equipo del levantamiento, filtros de Registros (fechas, tipo, frente…) y levantamiento con dron con sus protocolos por zona
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const { tipo } = require('./filtros');
const OUT = path.join(__dirname, 'capturas', 'prueba18'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const OPE = { uid: 'o1', email: 'operario@gmail.com', displayName: 'Pedro Operario' };
const GAB = { uid: 'g1', email: 'gabinete@gmail.com', displayName: 'Gabinete Prueba' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
}
const escuchar = (p, n) => { p.on('pageerror', e => { errores.push(n + ': ' + e.message); console.log('PAGEERROR', n, e.message); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts/.test(m.text())) { errores.push(n + ': ' + m.text()); console.log('CONSOLE', n, m.text()); } }); };
async function entrarComo(p, u) { await p.click('#btnSalir'); await p.waitForSelector('#gEntrar'); await p.evaluate(u => { window.__fakeLogin = u; }, u); await p.click('#gEntrar'); await p.waitForSelector('#nav button'); await p.waitForTimeout(400); }
const DIA = 864e5, hoy0 = (() => { const d = new Date(); d.setHours(10, 0, 0, 0); return d.getTime(); })();
const reg = (id, dias, extra) => ({ actividad: 'LIB', estado: 'EC', numero: 'SKT-TOP-0' + (1000 + id), creadoPor: 'otro@gmail.com', origen: 'excel', estructuraId: 'pp', subestructuraId: 'pp-oeste', elementoId: 'mt', tipoId: 'masivo', topografoId: 'GN', equipo: 'ET', capa: 'Capa 5', pkInicio: 100 * id, pkFin: 100 * id + 50, descripcion: 'Registro ' + id, fechaCampo: { __ts: hoy0 - dias * DIA }, creadoEn: { __ts: hoy0 - dias * DIA }, archivos: [], ...extra });
const isoDe = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const filas = p => p.$$eval('#lista tr[data-id] .tdesc span', x => x.map(e => e.textContent));
const cuenta = p => p.$$eval('#lista [data-id]', x => x.length);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await preparar(ctx);
  const p = await ctx.newPage(); escuchar(p, 'pc');
  await p.goto(URL);
  const base = {
    'usuarios/operario@gmail.com': { nombre: 'Pedro Operario', rol: 'operario', topografoId: 'GN', activo: true },
    'usuarios/gabinete@gmail.com': { nombre: 'Gabinete Prueba', rol: 'gabinete', activo: true },
    'contadores/skt': { ultimo: 2692 },
    'liberaciones/r1': reg(1, 0, {}), 'liberaciones/r2': reg(2, 0, { tipoId: 'filtro1', equipo: 'GNSS' }), 'liberaciones/r3': reg(3, 1, { subestructuraId: 'pp-este', topografoId: 'AB' }),
    'liberaciones/r4': reg(4, 5, { equipo: 'DRN', actividad: 'LEV', estado: 'NA', numero: '' }), 'liberaciones/r5': reg(5, 40, {}), 'liberaciones/r6': reg(6, 400, { tipoId: 'filtro1' })
  };
  await p.evaluate(([db, a]) => { localStorage.clear(); localStorage.setItem('__fakeDB', JSON.stringify(db)); localStorage.setItem('__fakeUser', JSON.stringify(a)); }, [base, ADMIN]);
  await p.reload(); await p.waitForSelector('#nav button'); await p.waitForTimeout(700);

  // 1. Ajustes → Protocolos: tres protocolos, dos para la Presa Principal y uno solo para el frente Este
  await p.click('[data-v="ajustes"]:not([hidden])'); await p.click('[data-tab="protocolos"]'); await p.waitForSelector('#prList');
  for (const n of ['Protocolo topográfico de superficie', 'Protocolo de volumen', 'Protocolo de taludes']) { await p.fill('#prNom', n); await p.click('#prAdd'); await p.waitForTimeout(150); }
  await p.waitForTimeout(200);
  const prot = await p.evaluate(() => window.__fakeStore()['listas/protocolos'].items);
  ok(prot.length === 3, 'se agregan los protocolos en Ajustes → Protocolos');
  // Superficie y volumen: toda la Presa Principal. Taludes: solo el frente Este
  const zona = async (i, z) => { if (!(await p.$(`.prot-row[data-i="${i}"] .prot-zonas`))) await p.click(`.prot-row[data-i="${i}"] [data-k="zonas"]`); await p.click(`.prot-row[data-i="${i}"] [data-z="${z}"]`); await p.waitForTimeout(150); };
  await zona(0, 'pp'); await zona(1, 'pp'); await zona(2, 'pp-este');
  ok(await p.evaluate(() => window.__fakeStore()['listas/protocolos'].items.map(x => x.zonas.join()).join('|')) === 'pp|pp|pp-este', 'cada protocolo guarda sus zonas');
  await p.screenshot({ path: path.join(OUT, '1-ajustes-protocolos.png'), fullPage: true });
  ok(await p.$eval('#prCod input[value="porProtocolo"]', i => i.checked), 'por defecto: un código por protocolo');
  // Equipos en Ajustes → Tipos
  await p.click('[data-tab="tipos"]'); await p.waitForSelector('#eqList');
  ok((await p.$$eval('#eqList [data-k="qnom"]', i => i.map(x => x.value))).join() === 'Estación total,GNSS,Dron', 'la lista de equipos se edita en Ajustes → Tipos');

  // 2. Filtros en Registros (computadora)
  await p.click('#nav [data-v="todos"]'); await p.waitForSelector('#rFil');
  ok(await cuenta(p) === 6, 'sin filtros se ven los 6 registros');
  await p.selectOption('#rfFecha', 'hoy'); await p.waitForTimeout(400);
  ok((await filas(p)).sort().join() === 'Registro 1,Registro 2', 'Hoy: solo los de hoy');
  await p.selectOption('#rfFecha', 'ayer'); await p.waitForTimeout(400);
  ok((await filas(p)).join() === 'Registro 3', 'Ayer');
  await p.selectOption('#rfFecha', '7d'); await p.waitForTimeout(400);
  ok(await cuenta(p) === 4, 'Últimos 7 días');
  await p.selectOption('#rfFecha', 'dia'); await p.waitForSelector('#rfF1');
  await p.fill('#rfF1', isoDe(hoy0 - 400 * DIA)); await p.press('#rfF1', 'Tab'); await p.waitForTimeout(500);
  ok((await filas(p)).join() === 'Registro 6', 'Un día: encuentra uno de hace más de un año (lo pide a Firebase)');
  await p.selectOption('#rfFecha', 'rango'); await p.waitForSelector('#rfF2');
  await p.fill('#rfF1', isoDe(hoy0 - 60 * DIA)); await p.press('#rfF1', 'Tab'); await p.waitForTimeout(200);
  await p.fill('#rfF2', isoDe(hoy0 - 1 * DIA)); await p.press('#rfF2', 'Tab'); await p.waitForTimeout(500);
  ok((await filas(p)).sort().join() === 'Registro 3,Registro 4,Registro 5', 'Entre fechas');
  ok(/registros ·/.test(await p.textContent('#view .lead')), 'la cabecera dice cuántos hay en esas fechas');
  await p.selectOption('#rfTipo', 'masivo'); await p.waitForTimeout(300);
  ok((await filas(p)).sort().join() === 'Registro 3,Registro 4,Registro 5', 'fechas + tipo se combinan');
  await p.click('#rfX'); await p.waitForTimeout(300);
  await p.selectOption('#rfTipo', 'filtro1'); await p.waitForTimeout(300);
  ok((await filas(p)).sort().join() === 'Registro 2,Registro 6', 'Tipo de liberación');
  await p.selectOption('#rfTipo', ''); await p.selectOption('#rfSub', 'pp-este'); await p.waitForTimeout(300);
  ok((await filas(p)).join() === 'Registro 3', 'Frente');
  await p.selectOption('#rfSub', 'pp'); await p.waitForTimeout(300);
  ok(await cuenta(p) === 6, '«Toda Presa Principal» incluye todos sus frentes');
  await p.selectOption('#rfSub', ''); await p.selectOption('#rfTopo', 'AB'); await p.waitForTimeout(300);
  ok((await filas(p)).join() === 'Registro 3', 'Topógrafo');
  await p.selectOption('#rfTopo', ''); await p.selectOption('#rfEq', 'DRN'); await p.waitForTimeout(300);
  ok((await filas(p)).join() === 'Registro 4', 'Equipo');
  await p.selectOption('#rfEq', ''); await p.selectOption('#rfAct', 'LEV'); await p.waitForTimeout(300);
  ok((await filas(p)).join() === 'Registro 4', 'Actividad');
  await p.screenshot({ path: path.join(OUT, '2-filtros-pc.png') });
  await p.click('#rfX'); await p.waitForTimeout(300);
  ok(await cuenta(p) === 6, '«Limpiar filtros» vuelve a mostrar todo');

  // 3. En campo: Equipo y levantamiento con dron
  await entrarComo(p, OPE);
  const m = p; await m.setViewportSize({ width: 390, height: 844 });
  await m.click('#nav [data-v="nueva"]'); await m.waitForSelector('#fEquipo');
  ok((await m.$$eval('#fEquipo [data-eq]', x => x.map(e => e.textContent))).join() === 'Estación total,GNSS,Dron', 'Nueva: Equipo con Estación total, GNSS y Dron');
  ok((await m.$$eval('#pAct [data-act]', x => x.map(e => e.title))).includes('Levantamiento con dron'), 'aparece la actividad «Levantamiento con dron»');
  await m.click('[data-act="DRN"]'); await m.waitForTimeout(150);
  ok(/Dron/.test(await m.textContent('#fEquipo')) && !(await m.$('#fEquipo [data-eq]')), 'con dron el equipo queda en «Dron» solo');
  await m.selectOption('#iEst', 'pp'); await m.waitForTimeout(80); await m.selectOption('#iSub', 'pp-este');
  await m.check('#iSinPk'); await m.fill('#iDesc', 'Vuelo dron frente este semana 45');
  await m.screenshot({ path: path.join(OUT, '3-nueva-dron.png'), fullPage: true });
  await m.click('#bGuardar'); await m.waitForTimeout(700);
  const drn = await m.evaluate(() => Object.entries(window.__fakeStore()).find(([k, v]) => k.startsWith('liberaciones/') && v.descripcion === 'Vuelo dron frente este semana 45'));
  ok(drn && drn[1].actividad === 'DRN' && drn[1].estado === 'PT' && drn[1].equipo === 'DRN', 'el levantamiento con dron queda «Pendiente» para gabinete, con equipo Dron');
  // Una liberación normal con equipo GNSS
  await m.click('[data-act="LIB"]'); await m.waitForTimeout(100);
  await m.click('#fEquipo [data-eq="GNSS"]');
  await tipo(m, 'masivo'); await m.selectOption('#iTopo', 'GN');
  await m.fill('#iPk1', '1+000'); await m.fill('#iPk2', '1+040'); await m.fill('#iDesc', 'Masivo con GNSS');
  await m.click('#bGuardar'); await m.waitForTimeout(700);
  ok(await m.evaluate(() => Object.values(window.__fakeStore()).some(x => x && x.descripcion === 'Masivo con GNSS' && x.equipo === 'GNSS')), 'la liberación guarda el equipo GNSS');
  ok(await m.$eval('#fEquipo [data-eq="GNSS"]', b => b.getAttribute('aria-pressed') === 'true'), 'el siguiente registro ya viene con el mismo equipo');
  // Filtros en el celular (Mis registros): hoja con «Aplicar» y chips
  await m.click('#nav [data-v="mis"]'); await m.waitForSelector('#rFilBtn');
  await m.click('#rFilBtn'); await m.waitForSelector('.dlg.on #rfHoja');
  await m.click('.dlg.on [data-fe="hoy"]'); await m.selectOption('.dlg.on #rfAct', 'DRN');
  await m.screenshot({ path: path.join(OUT, '4-filtros-cel.png') });
  await m.click('.dlg.on [type=submit]'); await m.waitForSelector('.dlg', { state: 'detached' });
  ok(await m.$$eval('#lista [data-id]', x => x.length) === 1 && /Hoy/.test(await m.textContent('#rChips')) && /Levantamiento con dron/.test(await m.textContent('#rChips')), 'celular: filtros en una hoja y chips de lo activo');
  await m.click('#rChips [data-quitar="act"]'); await m.waitForTimeout(250);
  ok(await m.$$eval('#lista [data-id]', x => x.length) === 2, 'la ✕ del chip quita ese filtro');
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin desplazamiento horizontal');

  // 4. Gabinete acepta el levantamiento con dron: protocolos de la zona marcados y un código por protocolo
  await m.setViewportSize({ width: 1440, height: 900 });
  await entrarComo(p, GAB);
  await p.click('#nav [data-v="bandeja"]'); await p.waitForTimeout(300);
  ok((await p.textContent('#blist')).includes('Vuelo dron frente este'), 'el levantamiento con dron llega a «Por aceptar»');
  await p.click('#blist tr[data-rid] >> text=Vuelo dron frente este'); await p.waitForSelector('#sheet.on');
  ok(/Aceptar y generar protocolos/.test(await p.textContent('#fAceptar')), 'en la ficha: «Aceptar y generar protocolos»');
  await p.click('#fAceptar'); await p.waitForSelector('.dlg.on .prot');
  const marcados = await p.$$eval('.dlg.on .check.prot input:checked', x => x.map(i => i.closest('label').textContent.trim()));
  ok(marcados.length === 3, `frente Este: salen marcados los 3 protocolos (${marcados.join(', ')})`);
  ok(/Generar 3 códigos/.test(await p.textContent('.dlg.on [type=submit]')), 'el botón dice cuántos códigos genera');
  await p.screenshot({ path: path.join(OUT, '5-aceptar-dron.png') });
  await p.click('.dlg.on [type=submit]'); await p.waitForTimeout(700);
  const r = await p.evaluate(id => window.__fakeStore()['liberaciones/' + id], drn[0].split('/')[1]);
  ok(r.estado === 'EP' && r.protocolos.length === 3 && r.protocolos.map(x => x.numero).join() === 'SKT-TOP-02693,SKT-TOP-02694,SKT-TOP-02695', 'se generan 3 códigos seguidos, uno por protocolo: ' + r.protocolos.map(x => x.numero).join(', '));
  ok(r.numero === 'SKT-TOP-02693' && await p.evaluate(() => window.__fakeStore()['contadores/skt'].ultimo) === 2695, 'el correlativo avanza 3');
  await p.click('#view .tabs [data-bt="EP"]'); await p.waitForTimeout(300);
  ok(/\+2/.test(await p.textContent('#blist')), 'en la lista se ve «+2» junto al código');
  await p.click('#blist tr[data-rid] >> text=Vuelo dron frente este'); await p.waitForSelector('#sheet.on');
  ok(/Protocolo de taludes/.test(await p.textContent('#sheet')) && /SKT-TOP-02695/.test(await p.textContent('#sheet')), 'la ficha lista los protocolos con sus códigos');
  await p.click('.sheet-x'); await p.waitForSelector('#sheet', { state: 'hidden' });

  // 5. Otro frente (Oeste) sin «taludes»; ajuste «un solo código»
  await entrarComo(p, ADMIN);
  await p.click('[data-v="ajustes"]:not([hidden])'); await p.click('[data-tab="protocolos"]'); await p.waitForSelector('#prCod');
  await p.check('#prCod input[value="uno"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__fakeStore()['config/general']?.drnCodigos) === 'uno', 'se puede cambiar a «un solo código por levantamiento»');
  await p.evaluate(async () => { const fs = await import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js');
    await fs.setDoc(fs.doc({}, 'liberaciones', 'd2'), { actividad: 'DRN', estado: 'PT', numero: '', creadoPor: 'operario@gmail.com', origen: 'app', estructuraId: 'pp', subestructuraId: 'pp-oeste', equipo: 'DRN', descripcion: 'Vuelo oeste', fechaCampo: new fs.Timestamp(Math.floor(Date.now() / 1000), 0), creadoEn: new fs.Timestamp(Math.floor(Date.now() / 1000), 0), archivos: [], topografoId: 'GN', tipoId: '', elementoId: '' }); });
  await p.click('#nav [data-v="bandeja"]'); await p.waitForTimeout(300); await p.click('#view .tabs [data-bt="PT"]'); await p.waitForTimeout(200);
  await p.click('#blist tr[data-rid] >> text=Vuelo oeste'); await p.waitForSelector('#sheet.on'); await p.click('#fAceptar'); await p.waitForSelector('.dlg.on .prot');
  const m2 = await p.$$eval('.dlg.on .check.prot input:checked', x => x.length);
  ok(m2 === 2 && /Otros protocolos \(1\)/.test(await p.textContent('.dlg.on')), 'frente Oeste: 2 marcados y «taludes» queda en «Otros protocolos»');
  ok(/Generar 1 código/.test(await p.textContent('.dlg.on [type=submit]')), 'con «un solo código» genera 1');
  await p.click('.dlg.on [type=submit]'); await p.waitForTimeout(700);
  const r2 = await p.evaluate(() => window.__fakeStore()['liberaciones/d2']);
  ok(r2.protocolos.length === 2 && r2.protocolos.every(x => x.numero === 'SKT-TOP-02696'), 'los 2 protocolos comparten el código SKT-TOP-02696');
  await b.close();
  ok(errores.length === 0, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
})();
