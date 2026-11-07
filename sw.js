/* Liberaciones TSF3: permite abrir la app sin señal. La página siempre se pide primero a internet
   (así llegan las actualizaciones); si no hay señal o tarda más de 4 s, se usa la última copia guardada.
   Al instalarse se guardan de una vez la página, el logo y las librerías de Firebase, para que la app
   instalada abra al instante y sin señal aunque nunca se haya usado sin internet.
   Los datos no pasan por aquí: Firestore los guarda en el teléfono y los sube cuando vuelve la señal. */
const CACHE = 'liberaciones-v7';
const SHELL = ['./', 'manifest.webmanifest', 'iconos/logo.svg', 'iconos/icono-192.png', 'iconos/icono-512.png',
  'iconos/icono-mascara-512.png', 'iconos/apple-touch-icon.png', 'iconos/favicon-32.png'];
const FB = 'https://www.gstatic.com/firebasejs/13.2.0/';
const LIBS = [FB + 'firebase-app.js', FB + 'firebase-auth.js', FB + 'firebase-firestore.js',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=Nunito+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap'];
const CDN = /^(www\.gstatic\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Uno por uno: si alguno falla (sin señal a medias) los demás igual quedan guardados
    await Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' }))));
    await Promise.allSettled(LIBS.map(async u => { if (!(await c.match(u))) await c.add(u); }));
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Las librerías no cambian (versión fija): se pasan de la copia anterior para no volver a bajarlas
    const viejas = (await caches.keys()).filter(k => k !== CACHE);
    const c = await caches.open(CACHE);
    for (const k of viejas) {
      const v = await caches.open(k);
      for (const req of await v.keys()) if (CDN.test(new URL(req.url).hostname) && !(await c.match(req))) {
        const res = await v.match(req); if (res) await c.put(req, res);
      }
      await caches.delete(k);
    }
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch (_) {} }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    e.respondWith((async () => {
      const nav = r.mode === 'navigate';
      const key = nav ? './' : r;
      // En la apertura se aprovecha la descarga que el navegador ya empezó (más rápido al tocar el ícono)
      const pedir = nav && e.preloadResponse ? e.preloadResponse.then(p => p || fetch(r)) : fetch(r);
      const net = pedir.then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
        return res;
      });
      const cached = await caches.match(key, { ignoreSearch: true });
      if (!cached) return net;
      net.catch(() => {});
      return Promise.race([
        net.catch(() => cached),
        new Promise(ok => setTimeout(() => ok(cached), 4000))
      ]);
    })());
    return;
  }
  if (CDN.test(u.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(r);
      const net = fetch(r).then(res => {
        if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    })());
  }
});
