// Service worker penerima notifikasi latar (Firebase Cloud Messaging).
//
// Terpisah dari sw.js — Firebase Messaging menuntut worker-nya sendiri, dan
// mencampurnya dengan cache aplikasi hanya membuat keduanya sulit ditelusuri.
//
// Diletakkan di subfolder push/ dengan sengaja. Dua service worker tidak bisa
// menguasai scope yang sama: didaftarkan di akar, ia akan MENGGANTIKAN sw.js
// dan mematikan cache offline serta pemasangan PWA. Dari sini scope-nya
// otomatis ./push/, terpisah rapi. Push tetap sampai — pengiriman tidak
// bergantung pada scope.
//
// Config-nya dikirim lewat query string saat didaftarkan, BUKAN ditulis di sini:
// tiap pengguna memakai project Firebase-nya sendiri, dan service worker tidak
// bisa membaca localStorage tempat config itu tersimpan. Menuliskan satu config
// tetap di file ini akan mengunci semua pengguna ke satu project.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const params = new URL(self.location).searchParams;
const cfg = {
  apiKey:            params.get('apiKey'),
  authDomain:        params.get('authDomain'),
  projectId:         params.get('projectId'),
  appId:             params.get('appId'),
  messagingSenderId: params.get('messagingSenderId'),
};

// Tanpa config lengkap, worker ini didiamkan saja. Melempar error di sini hanya
// akan memenuhi log tanpa memberi tahu siapa pun yang bisa memperbaikinya.
if (cfg.apiKey && cfg.projectId && cfg.messagingSenderId) {
  firebase.initializeApp(cfg);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(payload => {
    const d = payload.data || {};
    self.registration.showNotification(d.title || 'Budget Tracker', {
      body: d.body || 'Kamu belum mencatat budget kamu hari ini.',
      icon: '../icon-192.png',
      badge: '../icon-192.png',
      tag: 'pengingat-harian',   // menimpa pengingat sebelumnya, tidak menumpuk
      data: { url: d.url || './' },
    });
  });
}

// Mengetuk notifikasi harus membuka aplikasi, bukan sekadar menutup notifikasinya.
// Kalau tabnya sudah terbuka, difokuskan saja daripada membuka tab kedua.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const tujuan = new URL(e.notification.data?.url || '../', self.location).href;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(daftar => {
      for (const c of daftar) {
        if (c.url.startsWith(self.location.origin) && 'focus' in c) return c.focus();
      }
      return clients.openWindow ? clients.openWindow(tujuan) : null;
    })
  );
});
