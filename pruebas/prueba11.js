// Avance por capa en planta real: XML base (superficie o contorno), liberaciones con cruce y fuera de la base,
// lista de capas con filtros, planta real / desarrollada, y un frente sin eje
const { chromium, devices } = require('playwright'); const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'capturas', 'prueba11'); fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/';
const D = f => path.join(__dirname, 'datos', f);
const ADMIN = { uid: 'a1', email: 'brandonkluivertvillegasfranco@gmail.com', displayName: 'Brandon Villegas' };
const errores = [];
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
async function preparar(ctx) {
  await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+\.js)/, r => { const f = r.request().url().match(/(firebase-[a-z]+\.js)/)[1]; r.fulfill({ path: path.join(__dirname, 'fake', f), contentType: 'application/javascript' }); });
  await ctx.route(/fonts\./, r => r.abort());
}
const store = p => p.evaluate(() => window.__fakeStore());
const escuchar = (p, n) => { p.on('pageerror', e => { errores.push(n + ': ' + e.message); console.log('PAGEERROR', n, e.message); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts/.test(m.text())) { errores.push(n + ': ' + m.text()); console.log('CONSOLE', n, m.text()); } }); };
const pctDe = async p => { const t = await p.textContent('.avc-n b'); return parseFloat(t.replace(',', '.')); };
const aceptar = async p => { await p.waitForSelector('.dlg.on [type=submit]'); await p.waitForTimeout(250); await p.click('.dlg.on [type=submit]'); await p.waitForTimeout(400); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await preparar(ctx);
  const p = await ctx.newPage(); escuchar(p, 'pc');
  await p.goto(URL);
  await p.evaluate(u => {
    localStorage.clear();
    const capas = { tipos: { filtro1: { capas: [{ nombre: 'Capa 10' }, { nombre: 'Capa 11' }, { nombre: 'Capa 12' }], noAplica: [] } } };
    localStorage.setItem('__fakeDB', JSON.stringify({ 'capas/pp-oeste': capas, 'capas/pp-sur': capas }));
    localStorage.setItem('__fakeUser', JSON.stringify(u)); localStorage.setItem('lib.panelSub', JSON.stringify('pp-oeste')); localStorage.setItem('lib.panelVista', JSON.stringify('modelo'));
  }, ADMIN);
  await p.reload(); await p.waitForSelector('#nav button'); await p.click('[data-v="panel"]'); await p.waitForSelector('#mBody');
  await p.waitForSelector('#mCapas .capi');
  ok(await p.$$eval('#mCapas .capi', x => x.length) === 3, 'lista de capas al costado con las 3 capas de Ajustes → Capas');
  ok(await p.$eval('#mCapas', e => e.closest('.pside') !== null), 'en computadora la lista va en la columna de la izquierda');
  // Eje con secciones
  await p.setInputFiles('#mFile', D('eje-prueba.xml')); await aceptar(p);
  await p.waitForFunction(() => window.__fakeStore()['secciones/pp-oeste']);
  // Capa 11: subir base (superficie TIN)
  await p.selectOption('#mGrupo', 'filtro1|Capa 11'); await p.waitForSelector('[data-base]');
  ok((await p.textContent('#mBody')).includes('Sin base'), 'sin base: avisa que falta para ver el %');
  await p.setInputFiles('#mBaseFile', D('base-capa-tin.xml')); await p.waitForSelector('.dlg.on');
  ok(/3,7[45]\d m²/.test(await p.textContent('.dlg.on')), 'la base TIN se lee con su área: ' + (await p.textContent('.dlg.on dd.mono')));
  await aceptar(p);
  const st = await store(p); const base = Object.entries(st).find(([k]) => k.startsWith('bases/'));
  ok(base && base[1].grupo === 'filtro1|Capa 11' && base[1].anillos.length === 1, 'base guardada para Filtro 1 · Capa 11');
  await p.waitForSelector('.avc-n b');
  ok(await pctDe(p) === 0, 'con base y sin liberaciones: 0 %');
  // Liberación 2+220 – 2+260: se asigna a la capa elegida
  await p.setInputFiles('#mFile', D('liberacion-prueba.xml')); await p.waitForSelector('.dlg.on .mprev-c');
  ok(await p.$eval('.dlg.on select[name=t0]', s => s.value) === 'filtro1' && await p.$eval('.dlg.on input[name=c0]', i => i.value) === 'Capa 11', 'al subir, la liberación toma la capa elegida en pantalla');
  await aceptar(p); await p.waitForTimeout(400);
  const p1 = await pctDe(p);
  ok(Math.abs(p1 - 40) < 1.2, `una liberación de 40 m en una base de 100 m: ${p1} %`);
  // Dos más: una se cruza y otra sale de la base
  await p.setInputFiles('#mFile', [D('liberacion-cruce.xml'), D('liberacion-fuera.xml')]); await p.waitForSelector('.dlg.on .mprev-c >> nth=1'); await aceptar(p); await p.waitForTimeout(500);
  const p2 = await pctDe(p), aviso = await p.textContent('.avc-w');
  ok(Math.abs(p2 - 80) < 1.5, `tres liberaciones (cruce contado una vez, lo de afuera no cuenta): ${p2} %`);
  const m2 = re => +(aviso.match(re)?.[1] || '0').replace(/,/g, '');
  ok(Math.abs(m2(/Hay ([\d,]+) m² donde/) - 375) < 25, 'cruce de ~375 m² marcado: ' + aviso.trim().slice(0, 90));
  ok(Math.abs(m2(/([\d,]+) m² quedan fuera/) - 375) < 25, 'fuera de la base ~375 m² marcado');
  ok(await p.$$eval('#mReal path[fill="url(#hCru)"]', x => x.length) >= 1 && await p.$$eval('#mReal g[mask] .rlib', x => x.length) === 3, 'el dibujo muestra el cruce rayado y lo de afuera aparte');
  ok(await p.$('#mReal path[fill="url(#hFal)"]') && await p.$('.norte'), 'la base se ve con «falta liberar» y la flecha del norte');
  ok(await p.$$eval('#mReal .rlab.pk', x => x.length) >= 2, 'el eje con sus progresivas sobre la planta real');
  await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/01-planta-real.png' });
  // Elegir una liberación en la planta: va a su sección
  const lib = await p.$('#mReal g[clip-path] .rlib[data-sid$="skt-top-02686"]'); const bx = await lib.boundingBox();
  await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(400);
  ok(/PK 2\+2[2-6]0/.test(await p.textContent('#mSecT')), 'tocar una liberación la elige y va a su sección: ' + await p.textContent('#mSecT'));
  // Acercar y arrastrar
  await p.click('[data-rz="+"]'); await p.click('[data-rz="+"]');
  const vb1 = await p.$eval('#mReal', s => s.getAttribute('viewBox'));
  const sv = await (await p.$('#mReal')).boundingBox(); await p.mouse.move(sv.x + 200, sv.y + 60); await p.mouse.down(); await p.mouse.move(sv.x + 320, sv.y + 90, { steps: 5 }); await p.mouse.up();
  const vb2 = await p.$eval('#mReal', s => s.getAttribute('viewBox'));
  ok(vb1 !== '0 0 ' && vb1 !== vb2, 'acercar y arrastrar mueven la vista');
  await p.click('[data-rz="0"]');
  // Planta desarrollada y vuelta
  await p.click('[data-modo="des"]'); await p.waitForSelector('#mPlan svg .msup');
  ok(true, 'cambia a la planta desarrollada');
  await p.click('[data-modo="real"]'); await p.waitForSelector('#mReal');
  // Lista de capas: filtros y orden
  const capa11 = await p.textContent('#mCapas .capi.on');
  ok(/80/.test(capa11) && /faltan/.test(capa11) && /cruces/.test(capa11), 'en la lista: Capa 11 con su %, lo que falta y el aviso de cruces');
  await p.selectOption('#cfE', 'conbase'); await p.waitForTimeout(100);
  ok(await p.$$eval('#mCapas .capi', x => x.length) === 1, 'filtro «Con base»: 1 capa');
  await p.selectOption('#cfE', 'sinbase'); await p.waitForTimeout(100);
  ok(await p.$$eval('#mCapas .capi', x => x.length) >= 2, 'filtro «Sin base»');
  await p.selectOption('#cfE', ''); await p.fill('#cfQ', '12'); await p.waitForTimeout(100);
  ok(await p.$$eval('#mCapas .capi', x => x.length) === 1, 'buscar «12» deja la Capa 12');
  await p.fill('#cfQ', ''); await p.selectOption('#cfO', 'pmas'); await p.waitForTimeout(100);
  ok((await p.textContent('#mCapas .capi >> nth=0')).includes('Capa 11'), 'ordenar por mayor avance pone primero la Capa 11');
  await p.click('#mCapas .capi:has-text("Capa 12")'); await p.waitForTimeout(300);
  ok(await p.$eval('#mGrupo', s => s.value) === 'filtro1|Capa 12' && (await p.textContent('#mBody')).includes('Sin base'), 'tocar una capa en la lista la abre en la planta');
  await p.screenshot({ path: OUT + '/02-lista-capas.png' });
  // Reemplazar la base por un contorno (parcela) y quitarla
  await p.click('#mCapas .capi:has-text("Capa 11")'); await p.waitForTimeout(300);
  await p.setInputFiles('#mBaseFile', D('base-capa-contorno.xml')); await p.waitForSelector('.dlg.on');
  ok((await p.textContent('.dlg.on')).includes('Reemplaza la base actual'), 'subir otra base pide confirmar el reemplazo');
  await aceptar(p); await p.waitForTimeout(400);
  ok(Math.abs(await pctDe(p) - 80) < 1.5, 'con la base de contorno (parcela) da el mismo %: ' + await pctDe(p));
  await p.click('[data-quitabase]'); await aceptar(p); await p.waitForTimeout(400);
  ok(!(await p.$('.avc-n')) && !Object.keys(await store(p)).some(k => k.startsWith('bases/')), 'quitar base: la capa queda sin % y se borra');
  // Frente sin eje
  await p.selectOption('#pSub', 'pp-sur'); await p.waitForSelector('#mCapas .capi'); await p.waitForTimeout(300);
  await p.selectOption('#mGrupo', 'filtro1|Capa 11'); await p.waitForSelector('[data-base]');
  ok(await p.$eval('[data-modo="des"]', b => b.disabled), 'sin eje: solo planta real (la desarrollada se desactiva)');
  await p.setInputFiles('#mBaseFile', D('base-capa-tin.xml')); await aceptar(p);
  await p.setInputFiles('#mFile', D('liberacion-prueba.xml')); await p.waitForSelector('.dlg.on .mprev-c');
  ok((await p.textContent('.dlg.on')).includes('Sin eje'), 'sin eje: la liberación se ubica por sus coordenadas');
  await aceptar(p); await p.waitForTimeout(500);
  ok(Math.abs(await pctDe(p) - 40) < 1.2, 'sin eje también calcula el %: ' + await pctDe(p));
  await p.screenshot({ path: OUT + '/03-sin-eje.png' });
  // Celular
  const ctxM = await b.newContext({ ...devices['iPhone 13'] }); await preparar(ctxM);
  const m = await ctxM.newPage(); escuchar(m, 'movil');
  await m.goto(URL); await m.evaluate(([s, u]) => { localStorage.setItem('__fakeDB', s); localStorage.setItem('__fakeUser', JSON.stringify(u)); localStorage.setItem('lib.panelVista', JSON.stringify('modelo')); localStorage.setItem('lib.panelSub', JSON.stringify('pp-sur')); }, [await p.evaluate(() => localStorage.getItem('__fakeDB')), ADMIN]);
  await m.reload(); await m.waitForSelector('#nav button'); await m.click('[data-v="panel"]'); await m.waitForSelector('#mCapas .capi');
  await m.click('#mCapas .capi:has-text("Capa 11")'); await m.waitForSelector('#mReal'); await m.waitForTimeout(400);
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'celular: sin desplazamiento horizontal');
  ok(await m.$eval('#mCapas', e => !e.closest('.pside')), 'celular: la lista de capas va debajo de la planta');
  await m.screenshot({ path: OUT + '/04-movil.png', fullPage: true });
  console.log('Errores:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
