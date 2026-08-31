// Menguji pemformat nominal yang diekstrak dari index.html.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const a = html.indexOf('function formatRibuan(teks)');
const b = html.indexOf('function fmt(n)');
if (a === -1 || b === -1 || b <= a) { console.error('formatRibuan tidak ditemukan'); process.exit(2); }
// window belum ada di Node, jadi disiapkan agar window.formatNominal bisa dipasang.
const kode = 'const window = {};\n' + html.slice(a, b) +
             '\nexport { formatRibuan, angkaDari };\nexport const formatNominal = window.formatNominal;';
const { formatRibuan, angkaDari, formatNominal } = await import(
  'data:text/javascript,' + encodeURIComponent(kode));

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = Object.is(dapat, harap);
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)} harap=${JSON.stringify(harap)}`);
};

// ── formatRibuan ─────────────────────────────────
cek('ribuan',              formatRibuan('15000'), '15.000');
cek('ratusan ribu',        formatRibuan('150000'), '150.000');
cek('jutaan',              formatRibuan('1250000'), '1.250.000');
cek('di bawah seribu',     formatRibuan('500'), '500');
cek('kosong',              formatRibuan(''), '');
cek('huruf dibuang',       formatRibuan('abc15def000'), '15.000');
cek('sudah terformat tetap sama', formatRibuan('15.000'), '15.000');
// Nol di depan lahir saat orang menghapus digit pertama; kalau dibiarkan,
// "015.000" ikut tersimpan sebagai angka yang benar tapi terbaca aneh.
cek('nol di depan dibuang', formatRibuan('015000'), '15.000');
cek('nol tunggal tetap',    formatRibuan('0'), '0');
cek('angka (bukan string)', formatRibuan(44400), '44.400');

// ── angkaDari ────────────────────────────────────
cek('urai terformat',      angkaDari('15.000'), 15000);
cek('urai polos',          angkaDari('15000'), 15000);
cek('urai jutaan',         angkaDari('1.250.000'), 1250000);
cek('kosong -> NaN',       Number.isNaN(angkaDari('')), true);
cek('huruf saja -> NaN',   Number.isNaN(angkaDari('abc')), true);
cek('nol -> 0',            angkaDari('0'), 0);

// Bolak-balik harus utuh — ini yang menjamin nominal tersimpan apa adanya
for (const n of [500, 15000, 150000, 1250000, 999999999]) {
  cek(`bolak-balik ${n}`, angkaDari(formatRibuan(String(n))), n);
}

// ── posisi kursor ────────────────────────────────
// Bagian paling halus: kalau kursor selalu dilempar ke ujung, menyunting bagian
// tengah nominal jadi mustahil — setiap ketikan melompat ke belakang.
function elemenTiruan(nilai, kursor) {
  return {
    value: nilai, selectionStart: kursor,
    setSelectionRange(a) { this.selectionStart = a; },
  };
}
function ketik(nilaiSetelahKetik, kursorSetelahKetik) {
  const el = elemenTiruan(nilaiSetelahKetik, kursorSetelahKetik);
  formatNominal(el);
  return { nilai: el.value, kursor: el.selectionStart };
}

// "1500" + ketik "0" di ujung -> "15000" -> "15.000", kursor tetap di ujung
cek('ketik di ujung: nilai',  ketik('15000', 5).nilai,  '15.000');
cek('ketik di ujung: kursor', ketik('15000', 5).kursor, 6);

// Sisip "9" di tengah "15.000" -> "159.000"; kursor harus tetap setelah "9"
// (3 digit di depannya: 1,5,9), bukan melompat ke ujung.
cek('sisip di tengah: nilai',  ketik('159.000', 3).nilai,  '159.000');
cek('sisip di tengah: kursor', ketik('159.000', 3).kursor, 3);

// Menghapus digit pertama "15.000" -> "5.000"
cek('hapus digit awal: nilai',  ketik('5.000', 1).nilai,  '5.000');
cek('hapus digit awal: kursor', ketik('5.000', 1).kursor, 1);

// Kolom kosong tidak boleh melempar error
cek('kosong aman', ketik('', 0).nilai, '');

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
