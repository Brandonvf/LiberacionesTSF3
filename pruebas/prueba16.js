// «Qué se liberó»: un solo buscador (tolera tildes, plurales, errores y abreviaturas), el elemento se pone solo,
// y desde campo se agregan tipos y elementos nuevos revisando antes los nombres parecidos. Administrador y jefe los revisan o unen.
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const { equipo } = require('./filtros');
const OUT = path.join(__dirname, 'capturas', 'prueba16'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const OPE = { uid: 'o1', email: 'operario@gmail.com', displayName: 'Pedro Operario' };
const JEFE = { uid: 'j1', email: 'jefe@gmail.com', displayName: 'Jefe Prueba' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
}
const escuchar = (p, n) => { p.on('pageerror', e => { errores.push(n + ': ' + e.message); console.log('PAGEERROR', n, e.message); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts/.test(m.text())) { errores.push(n + ': ' + m.text()); console.log('CONSOLE', n, m.text()); } }); };
async function entrarComo(p, u) { await p.click('#btnSalir'); await p.waitForSelector('#gEntrar'); await p.evaluate(u => { window.__fakeLogin = u; }, u); await p.click('#gEntrar'); await p.waitForSelector('#nav button'); await p.waitForTimeout(400); }
const resultados = p => p.$$eval('#tRes .tsel-i[data-tipo] b', b => b.map(x => x.textContent));
const buscar = async (p, q) => { await p.fill('#iTipoQ', q); await p.waitForTimeout(120); };
const lista = (p, k) => p.evaluate(k => (window.__fakeStore()['listas/' + k] || {}).items || [], k);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); await preparar(ctx);
  const p = await ctx.newPage(); escuchar(p, 'cel');
  await p.goto(URL);
  await p.evaluate(([a]) => { localStorage.clear(); localStorage.setItem('__fakeDB', JSON.stringify({
    'usuarios/operario@gmail.com': { nombre: 'Pedro Operario', rol: 'operario', topografoId: 'GN', activo: true },
    'usuarios/jefe@gmail.com': { nombre: 'Jefe Prueba', rol: 'jefe', activo: true } })); localStorage.setItem('__fakeUser', JSON.stringify(a)); }, [ADMIN]);
  await p.reload(); await p.waitForSelector('#nav button'); await p.waitForTimeout(600);
  await entrarComo(p, OPE);
  await p.click('#nav [data-v="nueva"]'); await p.waitForSelector('#tSel');

  // 1. Buscador único
  ok(!(await p.$('#iEle')) && !(await p.$('#iTipo')) && await p.$('#iTipoQ'), 'Elemento y Tipo pasan a un solo buscador «Qué se liberó»');
  ok(await p.$eval('#iTipoQ', i => parseFloat(getComputedStyle(i).fontSize) >= 16 && i.getBoundingClientRect().height >= 50), 'letra y campo grandes para leer en campo');
  await buscar(p, 'rellno trans');
  ok((await resultados(p))[0] === 'Relleno de transición', 'con errores de tipeo y abreviado: «rellno trans» → Relleno de transición');
  ok(await p.$eval('#tRes .tsel-i mark', m => m.textContent.length > 0), 'resalta las palabras que coinciden');
  await buscar(p, 'GEOMEMBRANAS');
  ok((await resultados(p))[0] === 'Geomembrana', 'mayúsculas y plural: «GEOMEMBRANAS» → Geomembrana');
  await buscar(p, 'transicion relleno');
  ok((await resultados(p))[0] === 'Relleno de transición', 'palabras en otro orden y sin tilde');
  await buscar(p, 'Rellenos de transicion');
  ok(!(await p.$('#tRes [data-nuevo]')), 'si es el mismo nombre escrito distinto, no ofrece agregarlo');
  await buscar(p, 'relleno filtro 3');
  const r3 = await resultados(p);
  ok(r3.includes('Relleno filtro 1') && await p.$('#tRes [data-nuevo]'), '«relleno filtro 3» muestra los filtros que hay y ofrece agregarlo (el número lo hace distinto)');
  await p.screenshot({ path: path.join(OUT, '1-buscador.png') });
  await buscar(p, '');
  await p.click('#tRes [data-todos]');
  ok(await p.$$eval('#tRes .tsel-g', g => g.length) >= 3, '«Ver todos los tipos» los muestra agrupados por elemento');
  await buscar(p, 'masivo'); await p.click('#tRes [data-tipo="masivo"]');
  ok(/Relleno masivo/.test(await p.textContent('#tCambiar')) && /Movimiento de tierras/.test(await p.textContent('#tCambiar')), 'al elegir, se ve el tipo y su elemento (puesto solo)');
  ok(await p.inputValue('#fLib [name="elementoId"]') === 'mt', 'el elemento se guarda solo');
  await p.click('#tCambiar'); ok(await p.$('#iTipoQ'), '«Cambiar» vuelve al buscador');

  // 2. Agregar con un nombre muy parecido: sugiere el que existe
  await buscar(p, 'Relleno transision');
  await p.click('#tRes [data-nuevo]'); await p.waitForSelector('.dlg.on #nNom'); await p.waitForTimeout(300);
  ok(/muy parecido/.test(await p.textContent('#nSim')) && /Relleno de transición/.test(await p.textContent('#nSim')), 'al agregar «Relleno transision» avisa que ya existe «Relleno de transición»');
  ok(/No, agregar/.test(await p.textContent('.dlg.on [type=submit]')), 'el botón de agregar queda como segunda opción');
  await p.screenshot({ path: path.join(OUT, '2-parecido.png') });
  await p.fill('#nNom', 'relleno MASIVO'); await p.waitForTimeout(100);
  ok(await p.$eval('.dlg.on [type=submit]', b => b.disabled && /Ya existe/.test(b.textContent)), 'un nombre que ya existe no se puede agregar');
  await p.fill('#nNom', 'Relleno transision'); await p.waitForTimeout(100);
  await p.click('.dlg.on #nSim .btn.pri'); await p.waitForSelector('.dlg', { state: 'detached' });
  ok(/Relleno de transición/.test(await p.textContent('#tCambiar')) && (await lista(p, 'tipos')).every(t => t.nombre !== 'Relleno transision'), '«Usar» elige el que existe y no se crea el repetido');

  // 3. Agregar uno nuevo de verdad
  await p.click('#tCambiar'); await buscar(p, 'relleno filtro 3');
  await p.click('#tRes [data-nuevo]'); await p.waitForSelector('.dlg.on #nNom'); await p.waitForTimeout(250);
  ok(await p.inputValue('#nNom') === 'Relleno filtro 3', 'el nombre llega escrito, con mayúscula inicial');
  ok(!/muy parecido/.test(await p.textContent('#nSim')) && /Relleno filtro/.test(await p.textContent('#nSim')), 'muestra los parecidos (filtro 1 y 2) sin bloquear, porque el número es distinto');
  await p.click('.dlg.on [data-ele="mt"]'); await p.click('.dlg.on [type=submit]'); await p.waitForSelector('.dlg', { state: 'detached' });
  const t3 = (await lista(p, 'tipos')).find(t => t.nombre === 'Relleno filtro 3');
  ok(t3 && t3.elementoId === 'mt' && t3.nuevo === true && t3.creadoPor === 'operario@gmail.com' && t3.enGrafico === true, 'se agrega para todos, marcado como nuevo, con quién lo agregó y visible en el gráfico');
  ok(/Relleno filtro 3/.test(await p.textContent('#tCambiar')), 'y queda elegido en el formulario');

  // 4. Tipo con elemento nuevo (el elemento también revisa parecidos)
  await p.click('#tCambiar'); await buscar(p, 'Cuneta de coronación');
  await p.click('#tRes [data-nuevo]'); await p.waitForSelector('.dlg.on #nNom');
  await p.click('.dlg.on [data-ele=""]'); await p.fill('#nEleNom', 'tuberias'); await p.waitForTimeout(150);
  ok(/Tubería/.test(await p.textContent('#nEleSim')), 'al escribir «tuberias» como elemento nuevo sugiere «Tubería»');
  await p.fill('#nEleNom', 'Drenaje'); await p.waitForTimeout(100);
  await p.click('.dlg.on [type=submit]'); await p.waitForSelector('.dlg', { state: 'detached' });
  const els = await lista(p, 'elementos'), dr = els.find(e => e.nombre === 'Drenaje');
  ok(dr && dr.nuevo && (await lista(p, 'tipos')).find(t => t.nombre === 'Cuneta de coronación')?.elementoId === dr.id, 'se crea el elemento «Drenaje» y el tipo queda dentro de él');

  // 5. Sin señal no se agrega (se avisa)
  await p.click('#tCambiar'); await buscar(p, 'Algo totalmente nuevo');
  await ctx.setOffline(true); await p.click('#tRes [data-nuevo]'); await p.waitForTimeout(300);
  ok(!(await p.$('.dlg.on')) && /Se necesita señal/.test(await p.textContent('#toast')), 'sin señal avisa que hace falta señal para agregar');
  await ctx.setOffline(false);

  // 6. Guardar una liberación con el tipo nuevo; luego sale en «Usados por ti»
  await buscar(p, 'filtro 3'); await p.click('#tRes [data-tipo]:has-text("Relleno filtro 3")');
  await p.selectOption('#iTopo', 'GN'); await p.selectOption('#iEst', 'pp'); await p.waitForTimeout(80); await p.selectOption('#iSub', 'pp-oeste');
  await p.fill('#iPk1', '0+500'); await p.fill('#iPk2', '0+540'); await p.fill('#iDesc', 'Primera con filtro 3');
  await equipo(p); await p.click('#bGuardar'); await p.waitForTimeout(800);
  ok(await p.evaluate(id => Object.values(window.__fakeStore()).some(x => x && x.descripcion === 'Primera con filtro 3' && x.tipoId === id && x.elementoId === 'mt'), t3.id), 'la liberación se guarda con el tipo nuevo y su elemento');
  ok(/Relleno filtro 3/.test(await p.textContent('#tCambiar')), 'la siguiente liberación ya viene con el mismo tipo');
  await p.click('#tCambiar');
  ok((await p.$$eval('#tSel .tsel-chips .chip', c => c.map(x => x.textContent))).includes('Relleno filtro 3'), '«Usados por ti» muestra el tipo recién usado');
  await p.screenshot({ path: path.join(OUT, '3-usados.png'), fullPage: false });
  // Sin elegir tipo, el error se marca en el buscador
  await p.fill('#iPk1', '0+600'); await p.fill('#iDesc', 'sin tipo');
  await p.click('#bGuardar'); await p.waitForTimeout(400);
  ok(/Elige qué se liberó/.test(await p.textContent('#tSel')), 'si falta el tipo, el aviso aparece en «Qué se liberó»');

  // 7. Jefe: ve los nuevos en Ajustes, los marca revisados o los une
  await entrarComo(p, JEFE);
  ok(await p.$eval('[data-v="ajustes"]:not([hidden]) .badge', b => b.textContent) === '3', 'el menú Ajustes avisa 3 nombres nuevos por revisar');
  await p.click('[data-v="ajustes"]:not([hidden])'); await p.click('[data-tab="tipos"]'); await p.waitForSelector('#nvBox');
  ok(await p.$$eval('#nvBox .nv', r => r.length) === 3 && /Pedro Operario/.test(await p.textContent('#nvBox')), 'Ajustes → Tipos lista los agregados desde campo y quién los agregó');
  ok(/se parece a «Relleno filtro/.test(await p.textContent('#nvBox [data-nt="' + t3.id + '"]')), 'y dice a qué se parece');
  await p.screenshot({ path: path.join(OUT, '4-ajustes.png'), fullPage: true });
  await p.click(`#nvBox [data-ne="${dr.id}"] [data-k="rev"]`); await p.waitForTimeout(400);
  ok((await lista(p, 'elementos')).find(e => e.id === dr.id).nuevo === false, '«Revisado» quita la marca');
  await p.selectOption(`#nvBox [data-nt="${t3.id}"] [data-k="unir"]`, 'filtro2'); await p.waitForSelector('.dlg.on'); await p.click('.dlg.on [type=submit]'); await p.waitForTimeout(900);
  ok(await p.evaluate(() => Object.values(window.__fakeStore()).find(x => x && x.descripcion === 'Primera con filtro 3')?.tipoId) === 'filtro2', '«Unir con…» pasa sus registros al tipo correcto');
  ok(!(await lista(p, 'tipos')).some(t => t.id === t3.id), 'y quita el repetido de la lista');
  ok(await p.evaluate(() => Object.values(window.__fakeStore()).some(x => x && x.accion === 'editado' && /Tipo unido/.test(x.nota || ''))), 'queda en el historial');

  await b.close();
  ok(errores.length === 0, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
})();
