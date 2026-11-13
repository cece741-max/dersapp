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

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.mode !== 'navigate' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.open('dersapp-sayfa').then(async c => {
    const eski = await c.match(r, { ignoreSearch: true });
    const yeni = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; });
    if (eski) { yeni.catch(() => {}); return eski; }
    return yeni;
  }));
});
