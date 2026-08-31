// Service worker Budget Tracker Huda.
//
// Versi sebelumnya justru meng-unregister dirinya sendiri saat activate, dan tidak
// pernah didaftarkan dari index.html — jadi tidak ada service worker sama sekali.
// Akibatnya Chrome hanya menawarkan "Add to Home screen" berupa pintasan bookmark
// yang membuka tab browser, bukan "Install app" yang berjalan layar penuh.

const VERSI = 'bth-2026-08-31-g';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSI)
      // Satu file gagal tidak boleh menggagalkan seluruh instalasi.
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSI).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Hanya tangani milik origin sendiri. Firestore sudah punya penanganan offline
  // sendiri, dan mengintersepsi pustaka OCR dari CDN hanya akan mengacaukannya.
  if (url.origin !== self.location.origin) return;

  // Network-first: pembaruan hasil deploy langsung terpakai, cache hanya jadi
  // cadangan saat offline. Cache-first akan membuat pengguna terjebak di versi lama.
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const salinan = res.clone();
          caches.open(VERSI).then(c => c.put(req, salinan));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Navigasi ke URL apa pun saat offline tetap dilayani halaman utama.
        if (req.mode === 'navigate') {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
        }
        return new Response('Offline dan halaman ini belum tersimpan.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});
