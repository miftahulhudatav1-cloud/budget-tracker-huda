// Mengirim pengingat harian ke pengguna yang belum mencatat apa pun hari ini.
// Dijalankan oleh GitHub Actions (lihat .github/workflows/pengingat-harian.yml),
// bukan oleh aplikasi — inilah bagian yang membuat notifikasi tetap sampai
// meski aplikasinya tidak pernah dibuka.
//
// Kredensialnya adalah service account, yang MENEMBUS security rules. Ia hanya
// boleh hidup sebagai secret di GitHub, tidak pernah masuk repo.

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli",
               "Agustus","September","Oktober","November","Desember"];

const kredensial = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!kredensial) {
  console.error('FIREBASE_SERVICE_ACCOUNT belum diset.');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(kredensial)) });
const auth = getAuth();
const db = getFirestore();
const fcm = getMessaging();

// "Hari ini" harus dihitung di zona waktu PENGGUNA, bukan zona runner GitHub
// yang selalu UTC. Di WIB, memakai UTC berarti tujuh jam pertama tiap hari
// dinilai sebagai hari kemarin.
function tanggalDiZona(tz) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return f.format(new Date());              // en-CA memberi format YYYY-MM-DD
}

async function sudahMencatat(uid, tanggal, migrated) {
  const [y, m] = tanggal.split('-');
  const bulan = BULAN[parseInt(m, 10) - 1];

  if (migrated) {
    const snap = await db.collection(`users/${uid}/transactions`)
      .where('date', '==', tanggal).limit(1).get();
    return !snap.empty;
  }
  // Pengguna yang migrasinya belum selesai masih memakai koleksi per-bulan.
  for (const arus of ['in', 'out']) {
    const snap = await db.collection(`users/${uid}/${y}_${bulan}_${arus}`)
      .where('date', '==', tanggal).limit(1).get();
    if (!snap.empty) return true;
  }
  return false;
}

async function jalan() {
  let diperiksa = 0, dikirim = 0, dilewati = 0, gagal = 0;

  // Auth adalah satu-satunya daftar pengguna yang menyeluruh; Firestore tidak
  // bisa menyebutkan subkoleksi users/{uid} tanpa membaca semuanya.
  let halaman;
  do {
    halaman = await auth.listUsers(1000, halaman?.pageToken);
    for (const user of halaman.users) {
      const uid = user.uid;
      let setelan;
      try {
        setelan = (await db.doc(`users/${uid}/settings/app`).get()).data();
      } catch (e) {
        console.error(`  ${uid}: gagal membaca pengaturan —`, e.message);
        gagal++; continue;
      }

      const token = setelan?.fcmToken;
      if (!token) { dilewati++; continue; }     // belum mengaktifkan notifikasi

      diperiksa++;
      const tanggal = tanggalDiZona(setelan.tz);
      try {
        if (await sudahMencatat(uid, tanggal, setelan.migratedV2 === true)) {
          dilewati++; continue;
        }
        await fcm.send({
          token,
          // Sengaja data-only: dengan blok `notification`, browser menampilkan
          // notifikasinya sendiri dan onBackgroundMessage tidak pernah jalan,
          // sehingga ikon dan perilaku ketuk di service worker tidak terpakai.
          data: {
            title: 'Budget Tracker',
            body: 'Kamu belum mencatat budget kamu hari ini.',
            url: './',
          },
          webpush: { headers: { Urgency: 'normal', TTL: '43200' } },  // basi setelah 12 jam
        });
        dikirim++;
      } catch (e) {
        // Token mati saat aplikasi dicopot atau data situs dibersihkan.
        // Dibersihkan agar tidak dicoba terus setiap hari.
        if (['messaging/registration-token-not-registered',
             'messaging/invalid-argument'].includes(e.code)) {
          await db.doc(`users/${uid}/settings/app`).update({ fcmToken: '' }).catch(() => {});
          console.log(`  ${uid}: token kedaluwarsa, dibersihkan`);
        } else {
          console.error(`  ${uid}: gagal kirim —`, e.code || e.message);
        }
        gagal++;
      }
    }
  } while (halaman.pageToken);

  console.log(`Selesai — diperiksa ${diperiksa}, dikirim ${dikirim}, dilewati ${dilewati}, gagal ${gagal}`);
  // Sengaja tidak keluar dengan kode error saat sebagian gagal: satu token mati
  // tidak berarti tugasnya gagal, dan menandainya merah tiap hari membuat
  // kegagalan sungguhan jadi tak terlihat.
}

jalan().catch(e => { console.error('Fatal:', e); process.exit(1); });
