// Menampilkan siapa saja yang memakai aplikasi ini dan status langganannya.
//
// Langganan tidak bisa dijalankan sambil buta: tanpa daftar ini tidak ada cara
// mengetahui siapa yang baru mendaftar, masa cobanya habis besok, atau sudah
// berhenti membayar bulan lalu.
//
// Dijalankan MANUAL di komputer sendiri. Kredensialnya service account, yang
// MENEMBUS seluruh security rules — ia hanya boleh ada sebagai variabel
// lingkungan di komputermu, tidak pernah masuk repo.
//
// Sekali saja, dari dalam folder scripts/:
//   npm ci
//
// Pakai (juga dari dalam scripts/):
//   FIREBASE_SERVICE_ACCOUNT="$(cat ../../../kunci.json)" node daftar-pengguna.mjs
//   ... --habis        hanya yang perlu ditagih (masa coba/langganan berakhir)
//   ... --segera       yang berakhir dalam 7 hari ke depan
//
// Simpan kunci.json DI LUAR repo. Ia menembus seluruh security rules dan
// membuka data setiap pengguna; satu kali ter-commit sudah cukup untuk merusak.
//
// Status dihitung dengan hitungLangganan() yang DIAMBIL DARI index.html, bukan
// disalin ke sini. Kalau aturannya berubah di aplikasi, daftar ini ikut berubah
// — salinan terpisah akan menyimpang diam-diam, dan justru pada angka yang
// dipakai untuk menagih orang.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const kredensial = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!kredensial) {
  console.error('FIREBASE_SERVICE_ACCOUNT belum diset.');
  process.exit(1);
}

const akarApp = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(akarApp, 'index.html'), 'utf8');
// Penanda yang SAMA dengan tests/langganan.test.mjs — sengaja, supaya batas ini
// terjaga dari dua sisi. Batas akhir berhenti tepat sebelum fungsi-fungsi yang
// menyentuh DOM, yang tidak bisa dijalankan di Node.
const a = html.indexOf('const HARI_MASA_COBA');
const b = html.indexOf('// Dibaca sekali saat login.');
if (a === -1 || b === -1 || b <= a) {
  console.error('Blok langganan tidak ditemukan di index.html.');
  process.exit(2);
}
const { hitungLangganan, HARI_MASA_COBA } = await import(
  'data:text/javascript,' + encodeURIComponent(
    html.slice(a, b) + '\nexport { hitungLangganan, HARI_MASA_COBA };'));

const tglISO = d => {
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
};

initializeApp({ credential: cert(JSON.parse(kredensial)) });
const auth = getAuth();
const db = getFirestore();

const hariIni = tglISO(new Date());
const hanyaHabis  = process.argv.includes('--habis');
const hanyaSegera = process.argv.includes('--segera');

// listUsers dibatasi 1000 per panggilan; halaman berikutnya diambil lewat token.
const semua = [];
let token;
do {
  const hal = await auth.listUsers(1000, token);
  semua.push(...hal.users);
  token = hal.pageToken;
} while (token);

if (!semua.length) { console.log('Belum ada pengguna.'); process.exit(0); }

// Dokumen billing dibaca sekaligus, bukan satu per satu per pengguna: seribu
// pembacaan berurutan lambat dan tidak perlu.
const snap = await db.collection('billing').get();
const billing = new Map(snap.docs.map(d => [d.id, d.data()]));

const baris = semua.map(u => {
  const dibuat = u.metadata?.creationTime ? tglISO(new Date(u.metadata.creationTime)) : null;
  const st = hitungLangganan(dibuat, billing.get(u.uid) || null, hariIni);
  return {
    email: u.email || '(tanpa email)',
    daftar: dibuat || '?',
    status: st.status,
    sisa: st.sisaHari,
    sampai: st.sampai || '-',
    terakhirMasuk: u.metadata?.lastSignInTime
      ? tglISO(new Date(u.metadata.lastSignInTime)) : '-',
  };
});

const tampil = baris.filter(r =>
  hanyaHabis  ? r.status === 'kadaluarsa' :
  hanyaSegera ? (r.status !== 'kadaluarsa' && r.sisa <= 7) : true
);

// Yang paling mendesak di atas: yang sudah habis, lalu yang paling sedikit
// sisanya. Daftar yang harus digulir untuk menemukan hal penting tidak dibaca.
const urutan = { kadaluarsa: 0, trial: 1, aktif: 2 };
tampil.sort((x, y) => (urutan[x.status] - urutan[y.status]) || (x.sisa - y.sisa));

const lebar = (arr, k, min) => Math.max(min, ...arr.map(r => String(r[k]).length));
const wE = lebar(tampil, 'email', 5);
const label = { kadaluarsa: 'HABIS', trial: 'coba', aktif: 'aktif' };

console.log('');
console.log(`${'EMAIL'.padEnd(wE)}  STATUS  SISA  SAMPAI      DAFTAR      TERAKHIR MASUK`);
console.log('─'.repeat(wE + 52));
for (const r of tampil) {
  const sisa = r.status === 'kadaluarsa' ? '-' :
               (Number.isFinite(r.sisa) ? String(r.sisa) : '~');
  console.log(
    `${r.email.padEnd(wE)}  ${label[r.status].padEnd(6)}  ${sisa.padStart(4)}  ` +
    `${String(r.sampai).padEnd(10)}  ${r.daftar.padEnd(10)}  ${r.terakhirMasuk}`
  );
}

const hitung = s => baris.filter(r => r.status === s).length;
console.log('');
console.log(`${baris.length} pengguna — ${hitung('aktif')} berbayar, ` +
            `${hitung('trial')} masa coba, ${hitung('kadaluarsa')} habis.`);
if (tampil.length !== baris.length) console.log(`${tampil.length} ditampilkan (tersaring).`);
console.log(`Masa coba ${HARI_MASA_COBA} hari, dihitung dari tanggal akun dibuat.`);
console.log('Mengaktifkan: node scripts/aktifkan-langganan.mjs <email> [bulan]');
