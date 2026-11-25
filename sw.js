/* Service worker: menyimpan seluruh LMS agar bisa dibuka offline setelah kunjungan pertama. */
const CACHE = 'fbs-lms-v1';
const FILES = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './audio/v1.mp3', './audio/v2.mp3', './audio/v3.mp3', './audio/v4.mp3', './audio/v5.mp3'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Audio: layani dari cache utuh (juga untuk permintaan Range dari pemutar audio).
  if (url.origin === location.origin && url.pathname.endsWith('.mp3')) {
    e.respondWith(caches.match(req, { ignoreSearch: true, ignoreVary: true }).then(r => r || fetch(req)));
    return;
  }

  // Halaman: coba jaringan dulu agar selalu terbaru, cadangan dari cache saat offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('./index.html', c)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // File lain (termasuk Google Fonts): cache dulu, lalu simpan salinan dari jaringan.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r && (r.ok || r.type === 'opaque')) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
      return r;
    }).catch(() => hit))
  );
});
