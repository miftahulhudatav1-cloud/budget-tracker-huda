// Mengaktifkan atau memperpanjang langganan seorang pengguna.
//
// Dijalankan MANUAL di komputer sendiri setelah pembayaran diterima — bukan oleh
// GitHub Actions. Tidak ada payment gateway di sini: untuk jumlah pelanggan
// pertama, memeriksa transfer dengan mata sendiri lebih murah, lebih cepat
// dibuat, dan tidak menambah satu pun titik yang bisa rusak.
//
// Kredensialnya adalah service account, yang MENEMBUS seluruh security rules.
// Ia hanya boleh ada di komputermu sebagai variabel lingkungan — tidak pernah
// masuk repo, tidak pernah dikirim ke siapa pun.
//
// Pakai:
//   FIREBASE_SERVICE_ACCOUNT="$(cat kunci.json)" \
//     node scripts/aktifkan-langganan.mjs orang@contoh.com 1
//
// Angka terakhir adalah jumlah BULAN (bawaan 1). Bila langganannya masih
// berjalan, perpanjangan ditambahkan dari tanggal berakhir yang sekarang —
// bukan dari hari ini — supaya pelanggan yang membayar lebih awal tidak
// kehilangan sisa harinya.

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const kredensial = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!kredensial) {
  console.error('FIREBASE_SERVICE_ACCOUNT belum diset.');
  process.exit(1);
}

const email = process.argv[2];
const bulan = Number(process.argv[3] || 1);
if (!email || !email.includes('@')) {
  console.error('Pakai: node scripts/aktifkan-langganan.mjs <email> [bulan]');
  process.exit(1);
}
if (!Number.isInteger(bulan) || bulan < 1 || bulan > 24) {
  console.error('Jumlah bulan harus bilangan bulat 1-24.');
  process.exit(1);
}

const tglISO = d => {
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
};

// Menambah bulan lalu menjepit tanggalnya ke akhir bulan. Tanpa penjepitan,
// 31 Januari + 1 bulan menjadi 3 Maret di JavaScript — pelanggan mendapat dua
// hari lebih, dan tanggal jatuh temponya bergeser tiap perpanjangan.
function tambahBulan(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  const hari = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const akhirBulan = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(hari, akhirBulan));
  return tglISO(d);
}

initializeApp({ credential: cert(JSON.parse(kredensial)) });
const auth = getAuth();
const db = getFirestore();

const user = await auth.getUserByEmail(email).catch(() => null);
if (!user) {
  console.error(`Tidak ada akun dengan email ${email}. Pastikan dia sudah mendaftar lebih dulu.`);
  process.exit(1);
}

const hariIni = tglISO(new Date());
const ref = db.doc(`billing/${user.uid}`);
const lama = (await ref.get()).data() || null;

// Diperpanjang dari tanggal berakhir yang sekarang bila masih berlaku.
const mulaiDari = (lama?.sampai && lama.sampai >= hariIni) ? lama.sampai : hariIni;
const sampai = tambahBulan(mulaiDari, bulan);

await ref.set({
  sampai,
  email: user.email,
  diperbaruiPada: hariIni,
  riwayat: [...(lama?.riwayat || []), { pada: hariIni, bulan, sampai }].slice(-24),
}, { merge: true });

console.log(`${user.email}`);
console.log(`  sebelumnya : ${lama?.sampai || 'belum pernah berlangganan'}`);
console.log(`  sekarang   : aktif sampai ${sampai} (+${bulan} bulan)`);
