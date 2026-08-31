// Menguji logika jatuh tempo transaksi rutin, diekstrak dari index.html.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const a = html.indexOf('function kunciBulan(');
const b = html.indexOf('let rutinSudahDicek');
if (a === -1 || b === -1 || b <= a) { console.error('Blok jatuh tempo tidak ditemukan'); process.exit(2); }
const { kunciBulan, tanggalJatuhTempo, rutinJatuhTempo } = await import(
  'data:text/javascript,' + encodeURIComponent(
    html.slice(a, b) + '\nexport { kunciBulan, tanggalJatuhTempo, rutinJatuhTempo };'));

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)} harap=${JSON.stringify(harap)}`);
};

// Tanggal lokal (bukan UTC) — new Date(y, m, d) memakai zona waktu perangkat,
// sama seperti kode aplikasinya.
const tgl = (y, m, d) => new Date(y, m - 1, d);

// ── kunciBulan ───────────────────────────────────
cek('kunci bulan',        kunciBulan(tgl(2026, 8, 31)), '2026-08');
cek('bulan satu digit',   kunciBulan(tgl(2026, 1, 5)),  '2026-01');

// ── tanggalJatuhTempo ────────────────────────────
cek('tanggal biasa',      tanggalJatuhTempo(25, tgl(2026, 8, 31)), '2026-08-25');
// Tagihan tanggal 31 di bulan 30 hari harus dijepit, kalau tidak tidak pernah
// jatuh tempo di bulan-bulan pendek.
cek('31 di bulan 30 hari', tanggalJatuhTempo(31, tgl(2026, 4, 15)), '2026-04-30');
cek('31 di Februari',      tanggalJatuhTempo(31, tgl(2026, 2, 10)), '2026-02-28');
cek('hari tidak valid jadi 1', tanggalJatuhTempo(0, tgl(2026, 8, 5)), '2026-08-01');

// ── rutinJatuhTempo ──────────────────────────────
const daftar = [
  { id: 1, day: 1,  terakhir: null },       // tanggalnya sudah lewat
  { id: 2, day: 25, terakhir: null },       // belum jatuh tempo bila hari ini < 25
  { id: 3, day: 1,  terakhir: '2026-08' },  // sudah dibuat bulan ini
  { id: 4, day: 31, terakhir: null },       // dijepit ke akhir bulan
];

cek('tanggal 10 Agustus: hanya yang sudah lewat & belum dibuat',
  rutinJatuhTempo(daftar, tgl(2026, 8, 10)).map(r => r.id), [1]);

cek('tanggal 25 Agustus: yang tgl 25 ikut',
  rutinJatuhTempo(daftar, tgl(2026, 8, 25)).map(r => r.id), [1, 2]);

cek('tanggal 31 Agustus: yang tgl 31 ikut',
  rutinJatuhTempo(daftar, tgl(2026, 8, 31)).map(r => r.id), [1, 2, 4]);

// Di bulan 30 hari, tagihan tanggal 31 tetap jatuh tempo pada hari terakhir
cek('30 April: tagihan tgl 31 tetap jatuh tempo',
  rutinJatuhTempo([{ id: 4, day: 31, terakhir: null }], tgl(2026, 4, 30)).map(r => r.id), [4]);

// Bulan berganti: penanda bulan lalu tidak boleh menahan pembuatan bulan ini
cek('bulan baru: penanda lama tidak menahan',
  rutinJatuhTempo([{ id: 3, day: 1, terakhir: '2026-07' }], tgl(2026, 8, 5)).map(r => r.id), [3]);

cek('daftar kosong aman', rutinJatuhTempo([], tgl(2026, 8, 31)), []);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
