// Menguji logika jatuh tempo & pengejaran bulan terlewat, diekstrak dari index.html.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const a = html.indexOf('function kunciBulan(');
const b = html.indexOf('async function terapkanRutinJatuhTempo');
if (a === -1 || b === -1 || b <= a) { console.error('Blok jatuh tempo tidak ditemukan'); process.exit(2); }

const kode = html.slice(a, b).replace(/let rutinSudahDicek[^\n]*\n/, '');
const { kunciBulan, tanggalJatuhTempo, rutinJatuhTempo, bulanTerlewat } = await import(
  'data:text/javascript,' + encodeURIComponent(
    kode + '\nexport { kunciBulan, tanggalJatuhTempo, rutinJatuhTempo, bulanTerlewat };'));

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)}\n        harap=${JSON.stringify(harap)}`);
};

// Tanggal lokal (bukan UTC) — new Date(y, m, d) memakai zona waktu perangkat,
// sama seperti kode aplikasinya.
const tgl = (y, m, d) => new Date(y, m - 1, d);

// ── kunciBulan ───────────────────────────────────
cek('kunci bulan',      kunciBulan(tgl(2026, 8, 31)), '2026-08');
cek('bulan satu digit', kunciBulan(tgl(2026, 1, 5)),  '2026-01');

// ── tanggalJatuhTempo ────────────────────────────
cek('tanggal biasa',       tanggalJatuhTempo(25, tgl(2026, 8, 31)), '2026-08-25');
// Tagihan tanggal 31 di bulan 30 hari harus dijepit, kalau tidak ia tidak pernah
// jatuh tempo di April, Juni, September, November — dan tidak pernah di Februari.
cek('31 di bulan 30 hari',  tanggalJatuhTempo(31, tgl(2026, 4, 15)), '2026-04-30');
cek('31 di Februari',       tanggalJatuhTempo(31, tgl(2026, 2, 10)), '2026-02-28');
cek('hari tidak valid → 1', tanggalJatuhTempo(0, tgl(2026, 8, 5)),   '2026-08-01');

// ── rutinJatuhTempo ──────────────────────────────
const daftar = [
  { id: 1, day: 1,  terakhir: null },       // tanggalnya sudah lewat
  { id: 2, day: 25, terakhir: null },       // belum jatuh tempo bila hari ini < 25
  { id: 3, day: 1,  terakhir: '2026-08' },  // sudah dibuat bulan ini
  { id: 4, day: 31, terakhir: null },       // dijepit ke akhir bulan
];

cek('10 Agustus: hanya yang lewat & belum dibuat',
  rutinJatuhTempo(daftar, tgl(2026, 8, 10)).map(r => r.id), [1]);
cek('25 Agustus: yang tgl 25 ikut',
  rutinJatuhTempo(daftar, tgl(2026, 8, 25)).map(r => r.id), [1, 2]);
cek('31 Agustus: yang tgl 31 ikut',
  rutinJatuhTempo(daftar, tgl(2026, 8, 31)).map(r => r.id), [1, 2, 4]);
cek('30 April: tagihan tgl 31 tetap jatuh tempo',
  rutinJatuhTempo([{ id: 4, day: 31, terakhir: null }], tgl(2026, 4, 30)).map(r => r.id), [4]);
cek('bulan baru: penanda lama tidak menahan',
  rutinJatuhTempo([{ id: 3, day: 1, terakhir: '2026-07' }], tgl(2026, 8, 5)).map(r => r.id), [3]);
cek('daftar kosong aman', rutinJatuhTempo([], tgl(2026, 8, 31)), []);

// ── bulanTerlewat ────────────────────────────────
// id berisi Date.now() saat item dibuat; itu batas bawahnya, supaya item baru
// tidak langsung memuntahkan entri untuk bulan-bulan saat ia belum ada.
const idPada = (y, m) => tgl(y, m, 1).getTime();

cek('item lama, belum pernah dibuat → 3 bulan terlewat',
  bulanTerlewat({ id: idPada(2025, 1), day: 5, terakhir: null }, tgl(2026, 8, 10)).map(x => x.kunci),
  ['2026-05', '2026-06', '2026-07']);

cek('item baru dibuat bulan ini → tidak ada',
  bulanTerlewat({ id: idPada(2026, 8), day: 5, terakhir: null }, tgl(2026, 8, 10)), []);

cek('item dibuat bulan lalu → hanya sejak ia ada',
  bulanTerlewat({ id: idPada(2026, 7), day: 5, terakhir: null }, tgl(2026, 8, 10)).map(x => x.kunci),
  ['2026-07']);

cek('sudah sampai Juni → sisa Juli',
  bulanTerlewat({ id: idPada(2025, 1), day: 5, terakhir: '2026-06' }, tgl(2026, 8, 10)).map(x => x.kunci),
  ['2026-07']);

cek('sudah dibuat bulan ini → tidak ada',
  bulanTerlewat({ id: idPada(2025, 1), day: 5, terakhir: '2026-08' }, tgl(2026, 8, 10)), []);

cek('lintas pergantian tahun',
  bulanTerlewat({ id: idPada(2024, 1), day: 5, terakhir: null }, tgl(2026, 1, 15)).map(x => x.kunci),
  ['2025-10', '2025-11', '2025-12']);

// Dibatasi tiga bulan: tanpa batas, tidak membuka aplikasi setahun akan
// memunculkan dua belas bulan transaksi sekaligus.
cek('tidak lebih dari 3 bulan ke belakang',
  bulanTerlewat({ id: idPada(2020, 1), day: 5, terakhir: null }, tgl(2026, 8, 10)).length, 3);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
