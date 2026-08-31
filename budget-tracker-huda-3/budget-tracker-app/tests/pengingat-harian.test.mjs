// Menguji deteksi "sudah mencatat hari ini", diekstrak dari index.html.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const a = html.indexOf('function tanggalHariIni(');
const b = html.indexOf('window.tutupPengingat');
if (a === -1 || b === -1 || b <= a) { console.error('Blok pengingat tidak ditemukan'); process.exit(2); }

const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const prelude = `const MONTHS = ${JSON.stringify(MONTHS)};\nlet cache = {};\n`;
const after = `
export { tanggalHariIni, adaCatatanHariIni };
export function _set(c){ cache = c; }`;
const { tanggalHariIni, adaCatatanHariIni, _set } = await import(
  'data:text/javascript,' + encodeURIComponent(prelude + html.slice(a, b) + after));

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = Object.is(dapat, harap);
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)} harap=${JSON.stringify(harap)}`);
};

const tgl = (y, m, d) => new Date(y, m - 1, d);

// ── tanggalHariIni ───────────────────────────────
// Dibentuk dari komponen tanggal lokal, bukan toISOString(): toISOString memakai
// UTC, sehingga di WIB (UTC+7) setiap catatan sebelum pukul 07.00 akan dihitung
// sebagai hari sebelumnya dan pengingatnya muncul padahal sudah mencatat.
cek('format tanggal',       tanggalHariIni(tgl(2026, 8, 31)), '2026-08-31');
cek('bulan & hari 1 digit', tanggalHariIni(tgl(2026, 1, 5)),  '2026-01-05');
cek('dini hari tetap hari itu', tanggalHariIni(new Date(2026, 7, 31, 1, 30)), '2026-08-31');

// ── adaCatatanHariIni ────────────────────────────
const hariIni = tgl(2026, 8, 31);
const buat = (isi) => ({ 2026: { Agustus: isi } });

_set(buat({ in: [], out: [] }));
cek('belum ada catatan', adaCatatanHariIni(hariIni), false);

_set(buat({ in: [], out: [{ date: '2026-08-31', amount: 10000 }] }));
cek('ada pengeluaran hari ini', adaCatatanHariIni(hariIni), true);

_set(buat({ in: [{ date: '2026-08-31', amount: 50000 }], out: [] }));
cek('ada pemasukan hari ini', adaCatatanHariIni(hariIni), true);

_set(buat({ in: [], out: [{ date: '2026-08-30', amount: 10000 }] }));
cek('catatan kemarin tidak dihitung', adaCatatanHariIni(hariIni), false);

_set(buat({ in: [], out: [{ date: '2026-08-30' }, { date: '2026-08-31' }] }));
cek('campuran: yang hari ini terdeteksi', adaCatatanHariIni(hariIni), true);

// Bulan berjalan belum dimuat ke cache — tidak boleh melempar error
_set({});
cek('cache kosong aman', adaCatatanHariIni(hariIni), false);
_set({ 2026: {} });
cek('bulan belum ada aman', adaCatatanHariIni(hariIni), false);
_set(buat({}));
cek('in/out tidak ada aman', adaCatatanHariIni(hariIni), false);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
