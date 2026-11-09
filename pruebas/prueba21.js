// Capa al aceptar (gabinete) con aviso de traslape, levantamientos en la bandeja con «Enterado»,
// resumen del día para WhatsApp en Mis registros y subir la base de una capa en un frente vacío
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'capturas', 'prueba21'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const D = f => path.join(__dirname, 'datos', f);
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const OPE = { uid: 'o1', email: 'operario@gmail.com', displayName: 'Pedro Operario' };
const JEFE = { uid: 'j1', email: 'jefe@gmail.com', displayName: 'Jefe Prueba' };
const GAB = { uid: 'g1', email: 'gabinete@gmail.com', displayName: 'Gabinete Prueba' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
  // WhatsApp y portapapeles: se anota lo que se abre o copia
  await ctx.addInitScript(() => { window.__abierto = []; window.open = u => { window.__abierto.push(u); return null; }; try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__copiado = t; return Promise.resolve(); } } }); } catch (_) {} });
}
const escuchar = (p, n) => { p.on('pageerror', e => { errores.push(n + ': ' + e.message); console.log('PAGEERROR', n, e.message); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts/.test(m.text())) { errores.push(n + ': ' + m.text()); console.log('CONSOLE', n, m.text()); } }); };
async function entrarComo(p, u) { await p.click('#btnSalir'); await p.waitForSelector('#gEntrar'); await p.evaluate(u => { window.__fakeLogin = u; }, u); await p.click('#gEntrar'); await p.waitForSelector('#nav button'); await p.waitForTimeout(500); }
const store = p => p.evaluate(() => window.__fakeStore());
const reg = async (p, id) => (await store(p))['liberaciones/' + id];
const tabs = p => p.$$eval('#view .tabs [data-bt]', b => b.map(x => x.dataset.bt));
const badge = p => p.$eval('#nav [data-v="bandeja"]', b => b.querySelector('.badge')?.textContent || '');
const H = h => ({ __ts: Date.now() - h * 3600e3 });
const hoy0 = new Date(); hoy0.setHours(9, 30, 0, 0); const ayer0 = new Date(hoy0); ayer0.setDate(ayer0.getDate() - 1);
const base = (u) => ({ actividad: 'LIB', estado: 'PT', numero: '', creadoPor: OPE.email, origen: 'app', estructuraId: 'pp', subestructuraId: 'pp-oeste', elementoId: 'mt', tipoId: 'filtro1', topografoId: 'GN', equipo: 'ET', descripcion: '', fechaCampo: { __ts: hoy0.getTime() }, creadoEn: H(1), archivos: [], capa: '', ...u });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await preparar(ctx);
  const p = await ctx.newPage(); escuchar(p, 'pc');
  await p.goto(URL);
  await p.evaluate(([o, j, g, regs, ADMIN]) => {
    localStorage.clear();
    const db = {
      'usuarios/operario@gmail.com': { nombre: 'Pedro Operario', rol: 'operario', topografoId: 'GN', activo: true },
      'usuarios/jefe@gmail.com': { nombre: 'Jefe Prueba', rol: 'jefe', activo: true },
      'usuarios/gabinete@gmail.com': { nombre: 'Gabinete Prueba', rol: 'gabinete', activo: true },
      'capas/pp-oeste': { tipos: { filtro1: { capas: [{ nombre: 'Capa 15', cota: '780.50' }, { nombre: 'Capa 16' }], noAplica: [] } } } };
    Object.entries(regs).forEach(([k, v]) => { db['liberaciones/' + k] = v; });
    localStorage.setItem('__fakeDB', JSON.stringify(db)); localStorage.setItem('__fakeUser', JSON.stringify(ADMIN));
  }, [OPE, JEFE, GAB, {
    l0: base({ estado: 'EP', numero: 'SKT-TOP-00001', capa: 'Capa 15', pkInicio: 100, pkFin: 180, descripcion: 'Ya liberada', fechaCampo: { __ts: ayer0.getTime() } }),
    l1: base({ pkInicio: 150, pkFin: 200, descripcion: 'Filtro tramo nuevo' }),
    l2: base({ pkInicio: 300, pkFin: 350, descripcion: 'Lote A' }),
    l3: base({ pkInicio: 340, pkFin: 400, descripcion: 'Lote B' }),
    v1: base({ actividad: 'LEV', estado: 'NA', tipoId: '', elementoId: '', descripcion: 'Levantamiento de plataforma 480', pkInicio: null, pkFin: null }),
    v2: base({ actividad: 'LEV', estado: 'NA', tipoId: '', elementoId: '', descripcion: 'Levantamiento de acceso norte', fechaCampo: { __ts: ayer0.getTime() }, pkInicio: null, pkFin: null }),
    a1: base({ actividad: 'ASP', estado: 'NA', tipoId: '', elementoId: '', descripcion: 'Aspas zona sur', pkInicio: null, pkFin: null }),
    h1: base({ actividad: 'LEV', estado: 'NA', origen: 'excel', descripcion: 'Del histórico', pkInicio: null, pkFin: null })
  }, ADMIN]);
  await p.reload(); await p.waitForSelector('#nav button'); await p.waitForTimeout(800);

  // 1. Gabinete: capa al aceptar, con aviso de traslape
  await entrarComo(p, GAB);
  await p.click('#nav [data-v="bandeja"]'); await p.waitForSelector('[data-bt="PT"]'); await p.click('[data-bt="PT"]'); await p.waitForTimeout(300);
  ok((await tabs(p)).join() === 'PT,OB,EP,LEV', 'gabinete tiene la pestaña «Levantamientos»');
  await p.click('#blist tr[data-rid="l1"] [data-a="aceptar"]'); await p.waitForSelector('.dlg.on #dCapa');
  ok(await p.inputValue('#dCapa') === '' && await p.$$eval('#dlCapaAc option', o => o.map(x => x.value).join()) === 'Capa 15,Capa 16', 'al aceptar: campo Capa con las capas de Ajustes como sugerencia');
  ok(!(await p.$('.dlg.on .dsolape')), 'sin capa no hay cruce (la otra liberación es de la Capa 15)');
  await p.fill('#dCapa', '15'); await p.waitForTimeout(150);
  const av = await p.textContent('.dlg.on #dSolape');
  ok(/Se superpone en Capa 15/.test(av) && av.includes('SKT-TOP-00001') && /igual/.test(await p.textContent('.dlg.on [type=submit]')), 'al escribir «15» avisa que se cruza con SKT-TOP-00001 de la Capa 15: ' + av.replace(/\s+/g, ' ').trim().slice(0, 90));
  await p.screenshot({ path: path.join(OUT, '1-aceptar-capa-traslape.png') });
  await p.fill('#dCapa', 'Capa 16'); await p.waitForTimeout(150);
  ok(!(await p.$('.dlg.on .dsolape')) && (await p.textContent('.dlg.on [type=submit]')).trim() === 'Generar código', 'con otra capa el aviso desaparece');
  await p.fill('#dCapa', '15'); await p.click('.dlg.on [type=submit]'); await p.waitForTimeout(700);
  let r1 = await reg(p, 'l1');
  ok(/^SKT-TOP-\d{5}$/.test(r1.numero) && r1.capa === 'Capa 15' && r1.estado === 'EP', `se genera el código y queda la capa normalizada (${r1.numero} · ${r1.capa})`);
  ok(Object.values(await store(p)).some(x => x && x.liberacionId === 'l1' && /capa: Capa 15/.test(x.nota || '')), 'el historial dice qué capa puso gabinete');

  // Aceptar en grupo: una capa para el lote y aviso de cruces entre ellos
  await p.click('[data-bt="PT"]'); await p.waitForTimeout(200);
  await p.check('#blist tr[data-rid="l2"] [data-sel]'); await p.check('#blist tr[data-rid="l3"] [data-sel]');
  await p.click('[data-bk="aceptar"]'); await p.waitForSelector('.dlg.on #dCapa');
  ok(/vacío deja la de cada una/.test(await p.textContent('.dlg.on')), 'en grupo, la capa es opcional y vacía deja la de cada una');
  ok((await p.textContent('.dlg.on #dSolape')).includes('Sin número'), 'avisa que las dos del lote se cruzan entre sí');
  await p.fill('#dCapa', 'capa 16'); await p.waitForTimeout(150);
  ok(/Se superpone en Capa 16/.test(await p.textContent('.dlg.on #dSolape')), 'el aviso usa la capa escrita para el lote');
  await p.screenshot({ path: path.join(OUT, '2-aceptar-grupo.png') });
  await p.click('.dlg.on [type=submit]'); await p.waitForTimeout(900);
  const [r2, r3] = [await reg(p, 'l2'), await reg(p, 'l3')];
  ok(r2.capa === 'Capa 16' && r3.capa === 'Capa 16' && r2.numero && r3.numero, 'el lote queda con la Capa 16 y sus códigos');

  // 2. Levantamientos en la bandeja de gabinete
  ok(await badge(p) === '2', `el número de la bandeja suma los 2 levantamientos por ver (${await badge(p)})`);
  await p.click('[data-bt="LEV"]'); await p.waitForTimeout(300);
  const filas = await p.$$eval('#blist tr[data-rid]', r => r.map(x => x.dataset.rid));
  ok(filas.join() === 'v2,v1', 'solo los levantamientos de campo (sin aspas ni histórico), el más antiguo primero: ' + filas.join());
  ok(/Por ver\s*2/.test(await p.textContent('[data-lev="por"]')), '«Por ver 2»');
  await p.screenshot({ path: path.join(OUT, '3-bandeja-levantamientos.png') });
  await p.click('#blist tr[data-rid="v1"] [data-a="enterado"]'); await p.waitForTimeout(500);
  const v1 = await reg(p, 'v1');
  ok(v1.visto === true && v1.vistoNombre === 'Gabinete Prueba' && v1.vistoEn && v1.estado === 'NA', 'al tocar «Enterado» queda quién y cuándo lo vio (sigue sin código)');
  ok(/Por ver\s*1/.test(await p.textContent('[data-lev="por"]')) && await badge(p) === '1', 'baja a 1 por ver');
  await p.click('[data-lev="hechas"]'); await p.waitForTimeout(200);
  ok((await p.textContent('#blist')).includes('Gabinete Prueba'), 'en «Enterados» se ve quién lo vio');
  // Desde la ficha
  await p.click('[data-lev="por"]'); await p.waitForTimeout(200);
  await p.click('#blist tr[data-rid="v2"] td.tdesc'); await p.waitForSelector('#sheet.on #fVisto');
  ok((await p.textContent('#sheet')).includes('Levantamiento'), 'la ficha muestra el estado como «Levantamiento»');
  await p.click('#fVisto'); await p.waitForTimeout(500);
  ok((await reg(p, 'v2')).visto === true, 'también se marca «Enterado» desde la ficha');

  // Gabinete no edita lo de campo: solo capa, observar o rechazar
  await p.click('[data-bt="EP"]'); await p.waitForTimeout(300);
  ok(!(await p.$('#blist [data-a="editar"]')) && await p.$('#blist tr[data-rid="l1"] [data-a="capa"]'), 'en la bandeja gabinete ya no tiene «Editar»: tiene «Cambiar capa»');
  await p.click('#blist tr[data-rid="l1"] td.tdesc'); await p.waitForSelector('#sheet.on');
  ok(!(await p.$('#fEditar')) && await p.$('#fCapa'), 'en la ficha tampoco: solo «Cambiar capa»');
  await p.click('#fCapa'); await p.waitForSelector('.dlg.on #dCapa');
  ok(await p.inputValue('#dCapa') === 'Capa 15' && (await p.textContent('.dlg.on #dSolape')).includes('SKT-TOP-00001'), 'al cambiar la capa también avisa del traslape');
  await p.fill('#dCapa', '16'); await p.waitForTimeout(150); await p.click('.dlg.on [type=submit]'); await p.waitForTimeout(600);
  r1 = await reg(p, 'l1');
  ok(r1.capa === 'Capa 16' && r1.descripcion === 'Filtro tramo nuevo' && r1.pkInicio === 150, 'solo cambia la capa (lo demás de campo queda igual)');
  await p.click('#nav [data-v="bandeja"]'); await p.waitForTimeout(300);
    // 3. Jefe de área: aspas y levantamientos; puede quitar «Enterado»
  await entrarComo(p, JEFE);
  await p.click('#nav [data-v="bandeja"]'); await p.waitForTimeout(300);
  ok((await tabs(p)).join() === 'ASP,LEV', 'el jefe ve Aspas y Levantamientos');
  await p.click('[data-bt="LEV"]'); await p.waitForTimeout(200); await p.click('[data-lev="hechas"]'); await p.waitForTimeout(200);
  await p.click('#blist tr[data-rid="v2"] [data-a="quitar"]'); await p.waitForSelector('.dlg.on'); await p.click('.dlg.on [type=submit]'); await p.waitForTimeout(500);
  ok((await reg(p, 'v2')).visto === false, 'el jefe puede devolverlo a «Por ver»');

  // 4. Subir la base de una capa en un frente sin nada (Modelo 2D)
  await entrarComo(p, ADMIN);
  await p.evaluate(() => { localStorage.setItem('lib.panelSub', JSON.stringify('pp-este')); localStorage.setItem('lib.panelVista', JSON.stringify('modelo')); });
  await p.reload(); await p.waitForSelector('#nav button'); await p.click('[data-v="panel"]'); await p.waitForSelector('#mBody .m-inicio');
  ok(await p.$$eval('#mBody .m-op', x => x.length) === 3 && (await p.textContent('#mBody .m-op >> nth=0')).includes('Subir base de una capa'), 'frente vacío: botones «Subir base de una capa», «Subir liberaciones» y «Subir eje»');
  await p.screenshot({ path: path.join(OUT, '4-modelo-vacio.png') });
  // El borde (contorno) por el botón general «Subir XML»: se reconoce como base y pide la capa
  await p.setInputFiles('#mFile', D('base-capa-contorno.xml')); await p.waitForSelector('.dlg.on #dBCapa');
  ok(await p.$eval('#dBTipo', s => s.value) !== '' && await p.inputValue('#dBCapa') === '', 'un XML con borde se reconoce como base y pregunta tipo y capa');
  await p.fill('#dBCapa', '3'); await p.screenshot({ path: path.join(OUT, '5-base-capa-nueva.png') });
  await p.click('.dlg.on [type=submit]'); await p.waitForTimeout(600);
  const bases = Object.entries(await store(p)).filter(([k]) => k.startsWith('bases/'));
  ok(bases.length === 1 && bases[0][1].capa === 'Capa 3' && bases[0][1].subId === 'pp-este', 'la base se guarda como «Capa 3» de ese frente (capa nueva, sin ir a Ajustes)');
  await p.waitForSelector('.avc-n b');
  ok(await p.$eval('#mGrupo', s => s.value).then(v => v.endsWith('|Capa 3')) && (await p.textContent('.avc-n b')).includes('0'), 'queda elegida la Capa 3 con 0 % liberado, lista para ir sumando liberaciones');
  await p.screenshot({ path: path.join(OUT, '6-base-subida.png') });
  // Una superficie suelta: pregunta si es base o liberación
  await p.setInputFiles('#mFile', D('base-capa-tin.xml')); await p.waitForSelector('.dlg.on [name=es]');
  ok((await p.textContent('.dlg.on')).includes('¿Qué es este XML?'), 'una superficie suelta: pregunta si es base o liberación');
  await p.check('.dlg.on [name=es][value=base]'); await p.click('.dlg.on [type=submit]'); await p.waitForSelector('.dlg.on #dBCapa');
  ok(await p.inputValue('#dBCapa') === 'Capa 3' && /Reemplaza la base actual/.test(await p.textContent('.dlg.on')), 'como base, toma la capa elegida y avisa que reemplaza');
  await p.click('.dlg.on [data-x]'); await p.waitForTimeout(300);
  ok(await p.$('[data-base]') !== null, '«Subir base» siempre a la vista en la barra');

  // 5. Operario en el celular: ve «Visto» y manda el resumen por WhatsApp
  const ctxM = await b.newContext({ ...devices['Pixel 7'] }); await preparar(ctxM);
  const m = await ctxM.newPage(); escuchar(m, 'cel');
  await m.goto(URL); await m.evaluate(([s, u]) => { localStorage.setItem('__fakeDB', s); localStorage.setItem('__fakeUser', JSON.stringify(u)); }, [await p.evaluate(() => localStorage.getItem('__fakeDB')), OPE]);
  await m.reload(); await m.waitForSelector('#nav button'); await m.click('#nav [data-v="mis"]'); await m.waitForSelector('#rWsp');
  const t1 = await m.textContent('#lista .item[data-id="v1"]');
  ok(t1.includes('Levantamiento') && t1.includes('Enterado') && !t1.includes('Sin liberación'), 'en Mis registros el levantamiento dice «Levantamiento» y «Enterado»');
  await m.click('#rWsp'); await m.waitForSelector('.dlg.on #dWsp');
  const txt = await m.inputValue('#dWsp');
  ok(txt.startsWith('*Liberaciones TSF3*') && txt.includes('Pedro Operario'), 'el resumen empieza con el título y el nombre');
  ok(txt.includes('_Presa Principal Oeste_') && txt.includes('Relleno filtro 1') && txt.includes(r1.numero) && txt.includes('Capa 16') && txt.includes('(50 m)'), 'agrupa por frente, con tipo, capa, PK, metros y código');
  ok(txt.includes('Levantamiento de plataforma 480') && !txt.includes('acceso norte') && !txt.includes('Ya liberada'), 'por defecto solo lo de hoy');
  ok(/Total: 3 liberaciones \(160 m\) · Levantamiento topográfico: 2 · Aspas para vuelo de dron: 1$/.test(txt), 'cierra con el total: ' + txt.split('\n').at(-1));
  await m.waitForTimeout(500); await m.screenshot({ path: path.join(OUT, '7-resumen-wsp.png') });
  await m.click('.dlg.on [data-per="dos"]'); await m.waitForTimeout(150);
  const txt2 = await m.inputValue('#dWsp');
  ok(txt2.includes('acceso norte') && txt2.includes('Ya liberada') === false && (txt2.match(/\*\S{3} \d\d\/\d\d\*/g) || []).length === 2, '«Ayer y hoy» separa por día: ' + (txt2.match(/\*\S{3} \d\d\/\d\d\*/g) || []).join(' '));
  await m.click('#dWspCopiar'); await m.waitForTimeout(200);
  ok(await m.evaluate(() => window.__copiado) === txt2, 'se puede copiar');
  await m.click('.dlg.on [type=submit]'); await m.waitForTimeout(200);
  const url = await m.evaluate(() => window.__abierto[0] || '');
  ok(url.startsWith('https://wa.me/?text=') && decodeURIComponent(url.split('text=')[1]) === txt2, '«Abrir WhatsApp» lleva el texto listo para elegir el chat');
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'celular sin desplazamiento horizontal');
  // Con filtro activo, el resumen usa lo filtrado
  await m.click('#rFilBtn'); await m.waitForSelector('#rfHoja'); await m.click('#rfHoja [data-fe="ayer"]'); await m.click('.dlg.on [type=submit]'); await m.waitForTimeout(300);
  await m.click('#rWsp'); await m.waitForSelector('.dlg.on #dWsp');
  ok(await m.$eval('.dlg.on [data-per="fil"]', b => b.getAttribute('aria-pressed') === 'true') && (await m.inputValue('#dWsp')).includes('acceso norte') && !(await m.inputValue('#dWsp')).includes('plataforma 480'), 'con un filtro puesto, el resumen arranca con «Lo filtrado»');

  await b.close();
  ok(errores.length === 0, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
})();
