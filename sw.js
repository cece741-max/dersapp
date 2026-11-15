self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  const path = new URL(url).pathname;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if (new URL(c.url).pathname === path && 'focus' in c) { c.navigate(url).catch(() => {}); return c.focus(); }
    }
    return clients.openWindow(url);
  }));
});

// Sayfa kapalıyken gelen FCM bildirimi (yalnızca data yükü gelir; gösterimi burada yapıyoruz)
self.addEventListener('push', e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (_) { try { p = { body: e.data.text() }; } catch (__) {} }
  const d = p.data || p.notification || p;
  const title = d.title || 'Yeni bildirim';
  let url; try { url = new URL(d.url || 'ogrenci.html', self.registration.scope).href; } catch (_) { url = self.registration.scope; }
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    // Sayfa açıkken uygulama içi uyarı yeterli. iPhone her bildirimin gösterilmesini şart koşar, orada her zaman göster.
    const ios = /iPhone|iPad|iPod/.test(self.navigator.userAgent);
    if (!ios && list.some(c => c.visibilityState === 'visible')) return;
    return self.registration.showNotification(title, { body: d.body || '', tag: d.tag || undefined, data: { url } });
  }));
});

// Sayfa açılışı: önce internetten güncel sürüm (en çok 3 sn bekler), yavaş ya da çevrimdışıysa önbellekteki sürüm.
// cache:'no-cache' GitHub Pages'in kısa süreli tarayıcı önbelleğini atlar; değişmediyse sunucu kısa "değişmedi" yanıtı verir.
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.mode !== 'navigate' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.open('dersapp-sayfa').then(async c => {
    const eski = await c.match(r, { ignoreSearch: true });
    const yeni = fetch(r.url, { cache: 'no-cache', redirect: 'manual' }).then(res => { if (res.ok) c.put(r, res.clone()); return res; });
    e.waitUntil(yeni.catch(() => {}));
    if (!eski) return yeni;
    const bekle = new Promise(res => setTimeout(() => res(eski), 3000));
    return Promise.race([yeni.then(res => res.ok ? res : eski, () => eski), bekle]);
  }));
});
