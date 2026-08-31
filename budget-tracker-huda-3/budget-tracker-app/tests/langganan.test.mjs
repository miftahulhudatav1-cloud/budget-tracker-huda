// Menguji hitungLangganan() dari index.html. Bagian ini menentukan siapa yang
// boleh memakai aplikasi, jadi kekeliruan di sini punya dua sisi yang sama
// buruknya: pelanggan yang membayar terkunci di luar, atau masa coba yang bisa
// diulang tanpa batas.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const a = html.indexOf('const HARI_MASA_COBA');
// Batas akhir sengaja tepat setelah hitungLangganan(), sebelum fungsi-fungsi
// yang menyentuh DOM dan window — bagian itu tidak bisa dijalankan di Node.
const b = html.indexOf('// Dibaca sekali saat login.');
if (a === -1 || b === -1 || b <= a) { console.error('blok langganan tidak ditemukan'); process.exit(2); }
const { hitungLangganan, HARI_MASA_COBA, tambahHari, selisihHari } = await import(
  'data:text/javascript,' + encodeURIComponent(
    html.slice(a, b) + '\nexport { hitungLangganan, HARI_MASA_COBA, tambahHari, selisihHari };'));

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)}  harap=${JSON.stringify(harap)}`);
};

cek('masa coba 14 hari', HARI_MASA_COBA, 14);

// ── pembantu tanggal ─────────────────────────────
cek('tambahHari lintas bulan',  tambahHari('2026-01-25', 14), '2026-02-08');
cek('tambahHari lintas tahun',  tambahHari('2026-12-25', 14), '2027-01-08');
cek('tambahHari lompat kabisat',tambahHari('2028-02-20', 14), '2028-03-05');
cek('selisihHari mundur',       selisihHari('2026-03-10', '2026-03-01'), -9);

// ── masa coba ────────────────────────────────────
cek('hari pertama: masih 14 hari',
  hitungLangganan('2026-09-01', null, '2026-09-01'),
  { status: 'trial', sisaHari: 14, sampai: '2026-09-15' });

cek('hari terakhir masa coba masih boleh',
  hitungLangganan('2026-09-01', null, '2026-09-15'),
  { status: 'trial', sisaHari: 0, sampai: '2026-09-15' });

cek('sehari setelahnya kadaluarsa',
  hitungLangganan('2026-09-01', null, '2026-09-16').status, 'kadaluarsa');

// ── berbayar ─────────────────────────────────────
cek('berbayar mengalahkan masa coba yang habis',
  hitungLangganan('2026-01-01', { sampai: '2026-12-31' }, '2026-09-01'),
  { status: 'aktif', sisaHari: 121, sampai: '2026-12-31' });

cek('hari terakhir langganan masih aktif',
  hitungLangganan('2026-01-01', { sampai: '2026-09-01' }, '2026-09-01').status, 'aktif');

cek('langganan lewat sehari: kadaluarsa',
  hitungLangganan('2026-01-01', { sampai: '2026-08-31' }, '2026-09-01').status, 'kadaluarsa');

// Yang sudah kadaluarsa tetap menyimpan tanggal berbayarnya, bukan tanggal masa
// coba — supaya pesannya bisa berbunyi "langgananmu habis 31 Agustus", bukan
// tanggal masa coba dari berbulan-bulan lalu yang membingungkan.
cek('kadaluarsa menyebut tanggal langganan, bukan masa coba',
  hitungLangganan('2026-01-01', { sampai: '2026-08-31' }, '2026-09-01').sampai, '2026-08-31');

// ── masukan rusak: harus longgar, bukan mengunci ──
cek('tanggal akun kosong → tetap dibiarkan masuk',
  hitungLangganan(null, null, '2026-09-01').status, 'trial');
cek('tanggal akun ngawur → tetap dibiarkan masuk',
  hitungLangganan('bukan-tanggal', null, '2026-09-01').status, 'trial');
cek('billing kosong tidak melempar error',
  hitungLangganan('2026-09-01', {}, '2026-09-01').status, 'trial');
cek('billing.sampai ngawur diabaikan, jatuh ke masa coba',
  hitungLangganan('2026-09-01', { sampai: 'xx' }, '2026-09-01').status, 'trial');

// Masa coba TIDAK boleh bisa diulang: apa pun isi billing, tanggal pembuatan
// akun yang menentukan. Ini alasan utama nilainya diambil dari Firebase Auth.
cek('billing tidak bisa memperpanjang masa coba',
  hitungLangganan('2026-01-01', { sampai: '2020-01-01' }, '2026-09-01').status, 'kadaluarsa');

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
