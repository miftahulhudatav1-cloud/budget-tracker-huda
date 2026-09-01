// Menguji pilihNilaiAwal() dan fieldIngatan() dari index.html.
//
// Kategori, Jenis, dan Metode Bayar dulu dikosongkan setiap kali entri
// tersimpan. Pengeluaran harian berulang — makan, tunai, makan, tunai — jadi
// itu berarti tiga ketukan dropdown untuk hal yang sama setiap hari, dan jalan
// termudah adalah melewatinya. Padahal budget per kategori, insight, dan grafik
// pai semuanya menghitung dari kategori.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const a = html.indexOf('function pilihNilaiAwal(');
const b = html.indexOf('function ingatPilihan(');
if (a === -1 || b === -1 || b <= a) { console.error('blok pilihan terakhir tidak ditemukan'); process.exit(2); }
// opsiDari() menyentuh DOM tapi tidak dipanggil oleh yang diuji — cukup ada
// supaya potongannya bisa diurai.
const { pilihNilaiAwal, fieldIngatan, idField } = await import(
  'data:text/javascript,' + encodeURIComponent(
    html.slice(a, b) + '\nexport { pilihNilaiAwal, fieldIngatan, idField };'));

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)}  harap=${JSON.stringify(harap)}`);
};

const KATEGORI = ['Makanan', 'Transportasi', 'Kesehatan', 'Lainnya'];

// ── inti perbaikannya ────────────────────────────
cek('kosong → pakai yang diingat',
  pilihNilaiAwal('', 'Makanan', KATEGORI), 'Makanan');
cek('belum pernah memilih apa pun → tetap kosong',
  pilihNilaiAwal('', '', KATEGORI), '');

// ── yang sudah terisi tidak boleh ditimpa ────────
// Ini penting: hasil scan struk mengisi kategori sebelum form dipakai, dan
// tebakan dari struk itu lebih tahu daripada kebiasaan kemarin.
cek('nilai dari scan struk menang atas ingatan',
  pilihNilaiAwal('Kesehatan', 'Makanan', KATEGORI), 'Kesehatan');

// ── nilai yang tidak ada di dropdown ─────────────
// Daftar kategori bisa berubah antar versi. Nilai yang tidak ada lagi akan
// gagal dipasang tanpa suara dan menyisakan dropdown kosong tanpa sebab yang
// terlihat — lebih baik jatuh ke kosong secara sadar.
cek('ingatan yang sudah dihapus dari daftar diabaikan',
  pilihNilaiAwal('', 'KategoriLama', KATEGORI), '');
cek('nilai sekarang yang tidak sah jatuh ke ingatan',
  pilihNilaiAwal('KategoriLama', 'Makanan', KATEGORI), 'Makanan');
cek('dua-duanya tidak sah → kosong',
  pilihNilaiAwal('Hantu', 'Siluman', KATEGORI), '');

// ── masukan rusak tidak boleh melempar ───────────
cek('daftar opsi kosong → kosong',   pilihNilaiAwal('Makanan', 'Makanan', []), '');
cek('daftar opsi bukan array',       pilihNilaiAwal('Makanan', 'Makanan', null), '');
cek('null aman',                     pilihNilaiAwal(null, null, KATEGORI), '');
cek('undefined aman',                pilihNilaiAwal(undefined, undefined, KATEGORI), '');

// ── field mana yang diingat per arus ─────────────
// Metode bayar hanya ada di pengeluaran; mengingatnya untuk pemasukan berarti
// mencoba memasang nilai ke elemen yang tidak ada.
cek('pengeluaran mengingat tiga field', fieldIngatan('out'), ['Cat','Type','Method']);
cek('pemasukan mengingat dua field',    fieldIngatan('in'),  ['Cat','Type']);

// idField('in','Method') menunjuk 'outMethod' — elemen milik form PENGELUARAN.
// Karena itu penyapuan form harus mengikuti fieldIngatan(), bukan ketiganya;
// kalau tidak, menyimpan pemasukan ikut mengosongkan metode bayar di form
// pengeluaran yang sedang tidak disentuh.
cek('id metode selalu milik form pengeluaran', idField('in', 'Method'), 'outMethod');
cek('id kategori mengikuti arusnya',           idField('in', 'Cat'), 'inCat');
cek('id jenis mengikuti arusnya',              idField('out', 'Type'), 'outType');

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
