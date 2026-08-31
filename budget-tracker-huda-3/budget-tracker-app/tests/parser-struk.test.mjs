// Menguji parser yang BENAR-BENAR tertanam di index.html: blok parser diekstrak
// dari file aplikasi, bukan dari salinan terpisah yang bisa keburu berbeda.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const mulai = html.indexOf('// ── PARSER STRUK');
const akhir = html.indexOf('// Hanya isi field yang nilainya cocok');
if (mulai === -1 || akhir === -1 || akhir <= mulai) {
  console.error('Blok parser tidak ditemukan di index.html');
  process.exit(2);
}
const kode = html.slice(mulai, akhir);
const mod = await import('data:text/javascript,' + encodeURIComponent(
  kode + '\nexport { parseRupiah, parseReceipt };'
));
const { parseRupiah, parseReceipt } = mod;

let lulus = 0, gagal = 0;
function cek(nama, dapat, harap) {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)}  harap=${JSON.stringify(harap)}`);
}

cek('15.000 -> 15000',      parseRupiah('15.000'), 15000);
cek('Rp 15.000 -> 15000',   parseRupiah('Rp 15.000'), 15000);
cek('15.000,00 -> 15000',   parseRupiah('15.000,00'), 15000);
cek('1.250.000',            parseRupiah('1.250.000'), 1250000);
cek('15,000 koma ribuan',   parseRupiah('15,000'), 15000);
cek('45.50 ditolak',        parseRupiah('45.50'), null);
cek('teks non-angka',       parseRupiah('abc'), null);

cek('minimarket: bukan tunai/kembali', parseReceipt(`
INDOMARET
JL MERDEKA NO 12
TELP 021-5551234

INDOMIE GORENG      3.500
AQUA 600ML          4.000

SUBTOTAL           16.000
DISKON              1.500
TOTAL              14.500
TUNAI              50.000
KEMBALI            35.500

05/02/2026 14:23
`), { amount: 14500, ditebak: false, date: '2026-02-05', desc: 'INDOMARET', cat: 'Makanan' });

cek('spbu: grand total', parseReceipt(`
SPBU PERTAMINA 34.12708
JL RAYA BOGOR
PERTALITE
GRAND TOTAL  100.000
TANGGAL 12-01-2026
`), { amount: 100000, ditebak: false, date: '2026-01-12', desc: 'SPBU PERTAMINA 34.12708', cat: 'Transportasi' });

cek('apotek: nominal baris berikutnya', parseReceipt(`
APOTEK KIMIA FARMA
Jl Sudirman 45
PARACETAMOL 500MG   12.000
TOTAL BAYAR
37.000
Tanggal: 28 Feb 2026
`), { amount: 37000, ditebak: false, date: '2026-02-28', desc: 'APOTEK KIMIA FARMA', cat: 'Kesehatan' });

cek('resto: ppn tidak diambil', parseReceipt(`
WARUNG SATE PAK BUDI
SATE AYAM 10 TUSUK  35.000
SUBTOTAL            40.000
PPN 11%              4.400
TOTAL               44.400
01/03/2026
`), { amount: 44400, ditebak: false, date: '2026-03-01', desc: 'WARUNG SATE PAK BUDI', cat: 'Makanan' });

cek('31/02 ditolak',   parseReceipt('TOKO ABC\nTOTAL 20.000\n31/02/2026\n15/03/2026').date, '2026-03-15');
cek('teks kosong aman',parseReceipt(''), { amount:null, ditebak:false, date:null, desc:null, cat:null });

// ── cadangan saat kata TOTAL tidak terbaca ───────
// Cetakan pudar sering menghapus kata TOTAL. Angka terbesar dipakai sebagai
// tebakan — tapi baris tunai/kembalian tetap dibuang lebih dulu, kalau tidak
// TUNAI 50.000 akan mengalahkan total 30.000 yang sebenarnya.
const tanpaKataTotal = parseReceipt(`
WARUNG SEDERHANA
NASI GORENG    25.000
ES TEH          5.000
                30.000
TUNAI          50.000
KEMBALI        20.000
`);
cek('tebakan mengabaikan tunai & kembali', tanpaKataTotal.amount, 30000);
cek('tebakan ditandai',                    tanpaKataTotal.ditebak, true);

const punyaTotal = parseReceipt('TOKO\nTOTAL 14.500\nTUNAI 50.000');
cek('ada TOTAL: tidak ditandai tebakan', punyaTotal.ditebak, false);
cek('ada TOTAL: nilai dari baris TOTAL', punyaTotal.amount, 14500);

cek('satu barang tanpa TOTAL ikut ditebak',
  parseReceipt('TOKO XYZ\nBARANG A 5.000').amount, 5000);
cek('tak ada angka sama sekali', parseReceipt('TOKO ABC\nterima kasih').amount, null);
// Nomor meja atau jumlah item bukan nominal
cek('angka di bawah 1000 diabaikan', parseReceipt('TOKO\nMEJA 5\nQTY 2').amount, null);

// ── struk asli: rumah makan, Bogor ───────────────
// Diambil dari struk sungguhan yang gagal dibaca. Nilainya bukan pada angka
// totalnya, melainkan pada angka-angka pengecoh di sekitarnya: nomor telepon,
// Order ID, dan kode pos semuanya JAUH lebih besar dari total sebenarnya.
const strukAsli = `
Outlet 1
Jalan desa, Sukakarya, Kec. Megamendung, Kabupat
en Bogor, Jawa Barat 16770, Kab. Bogor, Jawa Bar
at, 16770
083140632957
Queue No:6
24 Agu 2026                          11:51
Receipt Number                       3B0DJ5
Order ID                             6M00006
Bill Name                            06
Collected By                  Yunita Maida
Dine In
Nasi Goreng Babat Horti      x1   Rp 40.000
Pedas
Nasi Goreng Kecombrang Sate..x1   Rp 55.000
Pedas
Subtotal                          Rp 95.000
PB1(10%)                           Rp 9.500
Service Charge(5%)                 Rp 4.750
Rounding Amount                    (Rp 250)
Total                            Rp 109.000
Dana                             Rp 109.000
Notes
Thankyou
`;
const hasilAsli = parseReceipt(strukAsli);
cek('struk asli: total 109.000, bukan subtotal 95.000', hasilAsli.amount, 109000);
cek('struk asli: bukan tebakan',                        hasilAsli.ditebak, false);
cek('struk asli: tanggal "24 Agu 2026"',                hasilAsli.date, '2026-08-24');
cek('struk asli: kategori Makanan',                     hasilAsli.cat, 'Makanan');

// "Subtotal" tidak boleh cocok dengan pola \btotal\b — kalau batas katanya
// keliru, seluruh struk berjenis ini akan melaporkan angka sebelum pajak.
cek('Subtotal tidak dianggap Total',
  parseReceipt('TOKO\nSubtotal Rp 95.000\nTotal Rp 109.000').amount, 109000);

// Bila kata Total rusak terbaca OCR, cadangan harus tetap menemukan 109.000 —
// BUKAN nomor telepon 083140632957 yang nilainya 83 miliar.
const totalRusak = strukAsli.replace('Total  ', 'T0ta1  ');
const hasilRusak = parseReceipt(totalRusak);
cek('kata Total rusak: cadangan tetap 109.000', hasilRusak.amount, 109000);
cek('cadangan menolak nomor telepon',           hasilRusak.amount < 1e9, true);
cek('ditandai sebagai tebakan',                 hasilRusak.ditebak, true);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
