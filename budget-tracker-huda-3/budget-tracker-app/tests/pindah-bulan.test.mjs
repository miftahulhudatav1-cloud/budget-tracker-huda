// Menguji periodeDariTanggal() dari index.html — penentu apakah sebuah entri
// yang diedit harus berpindah bulan.
//
// Bulan sebuah entri ditentukan oleh field periode/year/month, BUKAN oleh isi
// date-nya. Sebelum ada fungsi ini, mengubah tanggal ke bulan lain membuat
// entri tetap terdaftar di bulan lamanya sambil menampilkan tanggal bulan baru:
// uangnya masuk ke bulan yang salah dan total bulanannya keliru, tanpa satu pun
// tanda bagi pemiliknya.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const a = html.indexOf('function periodeDariTanggal(');
const b = html.indexOf('// Opsi dropdown di modal');
if (a === -1 || b === -1 || b <= a) { console.error('periodeDariTanggal tidak ditemukan'); process.exit(2); }
const { periodeDariTanggal } = await import(
  'data:text/javascript,' + encodeURIComponent(
    html.slice(a, b) + '\nexport { periodeDariTanggal };'));

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)}  harap=${JSON.stringify(harap)}`);
};

// monthIdx berbasis nol supaya langsung cocok dengan MONTHS[]
cek('Januari → indeks 0',  periodeDariTanggal('2026-01-15'), { year: 2026, monthIdx: 0 });
cek('Desember → indeks 11',periodeDariTanggal('2026-12-31'), { year: 2026, monthIdx: 11 });
cek('Agustus',             periodeDariTanggal('2026-08-01'), { year: 2026, monthIdx: 7 });

// Tanggal harus dibaca dari teksnya, bukan lewat new Date(). 'YYYY-MM-DD'
// diurai sebagai UTC, sehingga di WIB (UTC+7) tanggal 1 pukul 00:00 UTC masih
// terbaca sebagai tanggal 31 bulan sebelumnya — entri akan pindah ke bulan
// yang keliru justru karena zona waktu.
cek('tanggal 1 tidak tergeser ke bulan sebelumnya',
  periodeDariTanggal('2026-09-01'), { year: 2026, monthIdx: 8 });
cek('tanggal 31 tidak tergeser ke bulan berikutnya',
  periodeDariTanggal('2026-08-31'), { year: 2026, monthIdx: 7 });

// ── yang harus ditolak ───────────────────────────
// null berarti "tidak yakin" — dan pemanggilnya memperlakukan itu sebagai
// "jangan pindahkan". Melewatkan perpindahan jauh lebih aman daripada
// memindahkan entri ke bulan yang salah.
cek('kosong ditolak',            periodeDariTanggal(''), null);
cek('null ditolak',              periodeDariTanggal(null), null);
cek('undefined ditolak',         periodeDariTanggal(undefined), null);
cek('bukan tanggal ditolak',     periodeDariTanggal('besok'), null);
cek('bulan 13 ditolak',          periodeDariTanggal('2026-13-01'), null);
cek('bulan 00 ditolak',          periodeDariTanggal('2026-00-10'), null);
cek('hari 00 ditolak',           periodeDariTanggal('2026-05-00'), null);
cek('hari 32 ditolak',           periodeDariTanggal('2026-05-32'), null);
cek('format tanpa nol di depan ditolak', periodeDariTanggal('2026-8-1'), null);
cek('format Indonesia ditolak',  periodeDariTanggal('31/08/2026'), null);
cek('ada jam di belakang ditolak', periodeDariTanggal('2026-08-31T10:00'), null);

// Tahun di luar akal ditolak: salah ketik seperti 0226 atau 20226 tidak boleh
// menciptakan tahun yang kemudian mustahil ditemukan lagi lewat navigasi.
cek('tahun 0226 ditolak',        periodeDariTanggal('0226-08-31'), null);
cek('tahun 2000 diterima',       periodeDariTanggal('2000-01-01'), { year: 2000, monthIdx: 0 });
cek('tahun 2100 diterima',       periodeDariTanggal('2100-12-31'), { year: 2100, monthIdx: 11 });
cek('tahun 2101 ditolak',        periodeDariTanggal('2101-01-01'), null);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
