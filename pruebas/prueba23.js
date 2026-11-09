// Mejoras de diseño (revisión del 9/11/2026): formulario más rápido en campo, botones y letras para obra,
// acciones visibles, menú del celular con 5 botones y palabras únicas
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const { tipo } = require('./filtros');
const OUT = path.join(__dirname, 'capturas', 'prueba23'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
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
const H = h => ({ __ts: Date.now() - h * 3600e3 });
const reg = u => ({ actividad: 'LIB', estado: 'PT', numero: '', creadoPor: OPE.email, origen: 'app', estructuraId: 'pp', subestructuraId: 'pp-oeste', elementoId: 'mt', tipoId: 'filtro1', topografoId: 'GN', equipo: 'ET', descripcion: 'Registro', capa: 'Capa 15', fechaCampo: H(2), creadoEn: H(2), archivos: [], pkInicio: 100, pkFin: 140, ...u });
const DB = {
  'usuarios/operario@gmail.com': { nombre: 'Pedro Operario', rol: 'operario', topografoId: 'GN', activo: true },
  'usuarios/gabinete@gmail.com': { nombre: 'Gabinete Prueba', rol: 'gabinete', activo: true },
  'liberaciones/r1': reg({ descripcion: 'Pendiente de prueba' }),
  'liberaciones/r2': reg({ estado: 'OB', numero: '', notaObservacion: 'Falta CSV', pkInicio: 200, pkFin: 260, descripcion: 'Observada de prueba' }),
  'liberaciones/r3': reg({ estado: 'EC', numero: 'SKT-TOP-00007', pkInicio: 300, pkFin: 380, descripcion: 'Entregada de prueba' }),
  'liberaciones/r4': reg({ estado: 'EP', numero: 'SKT-TOP-00008', pkInicio: 400, pkFin: 440, descripcion: 'Vieja con enlaces', linksCsv: ['https://drive.google.com/archivo-csv'], linksFotos: [] }),
  'liberaciones/v1': reg({ actividad: 'LEV', estado: 'NA', tipoId: '', elementoId: '', pkInicio: null, pkFin: null, capa: '', descripcion: 'Levantamiento visto', visto: true, vistoPor: GAB.email, vistoNombre: 'Gabinete Prueba', vistoEn: H(1) })
};
async function abrir(b, u, disp) {
  const ctx = await b.newContext(disp); await preparar(ctx);
  const p = await ctx.newPage(); escuchar(p, u.uid);
  // Primero entra el administrador (deja las listas listas en Firebase), después la persona de la prueba
  await p.goto(URL); await p.evaluate(([db, a]) => { localStorage.clear(); localStorage.setItem('__fakeDB', JSON.stringify(db)); localStorage.setItem('__fakeUser', JSON.stringify(a)); }, [DB, ADMIN]);
  await p.reload(); await p.waitForSelector('#nav button'); await p.waitForTimeout(700);
  if (u !== ADMIN) { await p.evaluate(u => localStorage.setItem('__fakeUser', JSON.stringify(u)), u); await p.reload(); await p.waitForSelector('#nav button'); await p.waitForTimeout(500); }
  return [ctx, p];
}
const CEL = { viewport: { width: 380, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

(async () => {
  const b = await chromium.launch();

  // ===== Grupo A · Formulario «Nueva» (celular de 380 px, operario) =====
  let [ctx, p] = await abrir(b, OPE, CEL);
  if (!(await p.$('#fLib'))) await p.click('#nav [data-v="nueva"]');
  await p.waitForSelector('#fLib');
  // T2
  ok(await p.$eval('.lead', l => getComputedStyle(l).display !== 'none' && l.innerText.trim() === 'Se guarda sin señal y se sube sola al recuperarla.'), 'T2: a 380 px se ve «Se guarda sin señal y se sube sola al recuperarla.»');
  // T6
  ok(await p.$('#pAct.seg') && await p.$eval('#pAct', e => e.getBoundingClientRect().height < 110), 'T6: la actividad es un control segmentado compacto');
  ok(await p.$eval('#tSel .flabel', e => { const c = getComputedStyle(e); return c.fontSize === '15px' && c.textTransform === 'none' && +c.fontWeight >= 700; }), 'T6: «Qué se liberó» en 15 px, negrita y sin mayúsculas');
  // T1
  await p.selectOption('#iEst', 'pp'); await p.waitForTimeout(100); await p.selectOption('#iSub', 'pp-oeste'); await tipo(p, 'filtro2');
  ok(await p.inputValue('#iDesc') === 'Liberación de relleno filtro 2 Presa Principal Oeste', 'T1: al elegir frente y tipo la descripción se llena sola: ' + await p.inputValue('#iDesc'));
  await p.fill('#iCapa', '15'); await p.locator('#iCapa').blur(); await p.waitForTimeout(100);
  ok(await p.inputValue('#iDesc') === 'Liberación de relleno filtro 2 capa 15 Presa Principal Oeste', 'T1: con la capa se agrega «capa 15»');
  ok(/se llena sola; puedes corregirla/.test(await p.textContent('label[for=iDesc]')), 'T1: la etiqueta dice que se llena sola');
  await p.fill('#iDesc', 'Escrita a mano'); await p.fill('#iCapa', 'Capa 16'); await p.locator('#iCapa').blur(); await p.waitForTimeout(100);
  ok(await p.inputValue('#iDesc') === 'Escrita a mano', 'T1: si la persona la corrigió, ya no se toca');
  await p.fill('#iDesc', ''); await p.selectOption('#iTopo', 'GN'); await p.click('[data-eq="ET"]');
  // T4
  await p.fill('#iPk1', '2+180'); await p.locator('#iPk1').blur(); await p.fill('#iPk2', '2+140'); await p.locator('#iPk2').blur(); await p.waitForTimeout(100);
  ok((await p.textContent('#iPk2 >> xpath=ancestor::div[contains(@class,"f")]')).includes('El PK final no puede ser menor que el inicio'), 'T4: PK final menor avisa al salir del campo, sin tocar «Guardar»');
  await p.screenshot({ path: path.join(OUT, 'A1-form-celular.png'), fullPage: true });
  await p.fill('#iPk2', '2+220'); await p.locator('#iPk2').blur(); await p.waitForTimeout(100);
  ok(!(await p.$('#iPk2 >> xpath=ancestor::div[contains(@class,"f")]//div[@class="err-msg"]')), 'T4: al corregirlo el aviso se quita');
  // T1: vacía se llena al guardar
  await p.click('#bGuardar'); await p.waitForTimeout(700);
  const g = await p.evaluate(() => Object.values(window.__fakeStore()).find(x => x && x.pkInicio === 2180));
  ok(g && g.descripcion === 'Liberación de relleno filtro 2 capa 16 Presa Principal Oeste' && !('_descAuto' in g), 'T1: vacía se llena al guardar y _descAuto no va a Firebase');
  ok(/Liberación guardada/.test(await p.textContent('#toast')), 'T3: aviso «Liberación guardada»');
  // T3
  await p.click('[data-act="LEV"]'); await p.waitForTimeout(150);
  ok((await p.textContent('.view-title')).trim() === 'Nuevo levantamiento' && (await p.textContent('#bGuardar')).trim() === 'Guardar levantamiento', 'T3: con «Levantamiento topográfico» título y botón dicen «levantamiento»');
  ok(await p.inputValue('#iDesc') === 'Levantamiento topográfico Presa Principal Oeste', 'T1: en otras actividades «{actividad} {frente}»');
  await p.click('[data-act="ASP"]'); await p.waitForTimeout(150);
  ok((await p.textContent('.view-title')).trim() === 'Nuevas aspas' && (await p.textContent('#bGuardar')).trim() === 'Guardar aspas', 'T3: «Nuevas aspas» / «Guardar aspas»');
  await p.screenshot({ path: path.join(OUT, 'A2-aspas.png') });
  // T5
  ok(!/data-add|linkRow/.test(HTML), 'T5: no queda código de enlaces (data-add, linkRow)');
  await ctx.close();
  [ctx, p] = await abrir(b, GAB, { viewport: { width: 1366, height: 860 } });
  await p.click('#nav [data-v="todos"]'); await p.waitForSelector('.rtab tr[data-id="r4"]'); await p.click('.rtab tr[data-id="r4"] td:nth-child(4)'); await p.waitForSelector('#sheet.on');
  ok((await p.textContent('#sheet')).includes('drive.google.com/archivo-csv'), 'T5: una ficha vieja con enlaces de Drive los sigue mostrando');
  await ctx.close();

  // __GRUPO_B__

  await b.close();
  ok(errores.length === 0, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
})();
