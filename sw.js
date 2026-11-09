/* Liberaciones TSF3: permite abrir la app sin señal. La página abre al instante con la última copia guardada
   y a la vez se baja la nueva; si cambió, se avisa a la app para que muestre «Hay una versión nueva».
   Al instalarse se guardan de una vez la página, el logo y las librerías de Firebase, para que la app
   instalada abra al instante y sin señal aunque nunca se haya usado sin internet.
   Los datos no pasan por aquí: Firestore los guarda en el teléfono y los sube cuando vuelve la señal. */
const CACHE = 'liberaciones-v17';
const SHELL = ['./', 'manifest.webmanifest', 'iconos/logo.svg', 'iconos/icono-192.png', 'iconos/icono-512.png',
  'iconos/icono-mascara-512.png', 'iconos/apple-touch-icon.png', 'iconos/favicon-32.png'];
const FB = 'https://www.gstatic.com/firebasejs/13.2.0/';
const LIBS = [FB + 'firebase-app.js', FB + 'firebase-auth.js', FB + 'firebase-firestore.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap'];
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
    // Las librerías no cambian (versión fija): se pasan de la copia anterior para no volver a bajarlas (también el conversor de fotos HEIC)
    const viejas = (await caches.keys()).filter(k => k !== CACHE);
    const c = await caches.open(CACHE);
    for (const k of viejas) {
      const v = await caches.open(k);
      for (const req of await v.keys()) if ((CDN.test(new URL(req.url).hostname) || new URL(req.url).pathname.includes('/lib/')) && !(await c.match(req))) {
        const res = await v.match(req); if (res) await c.put(req, res);
      }
      await caches.delete(k);
    }
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.disable(); } catch (_) {} }
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
      // La página se revalida siempre con el servidor (GitHub deja copias de hasta 10 min en el navegador)
      const pedir = nav ? fetch(new Request(r.url, { cache: 'no-cache', credentials: 'same-origin' })) : fetch(r);
      const cached = await caches.match(key, { ignoreSearch: true });
      const net = pedir.then(async res => {
        if (res && res.ok) {
          const c = await caches.open(CACHE);
          // Si la página cambió respecto de la copia que se mostró, se avisa a la app abierta
          const etiq = x => x && (x.headers.get('etag') || x.headers.get('last-modified') || '');
          const cambio = nav && cached && etiq(cached) && etiq(cached) !== etiq(res);
          await c.put(key, res.clone());
          if (cambio) for (const cl of await self.clients.matchAll({ type: 'window' })) cl.postMessage({ tipo: 'version-nueva' });
        }
        return res;
      });
      if (!cached) return net;
      // Abre al instante con la copia guardada; la descarga sigue en segundo plano
      e.waitUntil(net.catch(() => {}));
      return cached;
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
