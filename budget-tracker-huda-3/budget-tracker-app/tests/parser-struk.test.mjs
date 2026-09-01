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

// ── keluaran OCR sungguhan ───────────────────────
// Ini teks apa adanya dari Tesseract untuk struk di atas, difoto di atas batu
// dengan cahaya seadanya. Tes paling berharga di berkas ini, karena bukan
// karangan: kata "Total" hilang sepenuhnya, "Rounding" jadi "ding", "subtotal"
// jadi "subtota|", dan latar batunya menyumbang sampah di tiap baris.
const ocrAsli = `Da Ani ar
Jalan desa, Sukakarya, KEC. Yegamendung. Kabupat 7 7 5 AA, :
en Bogor, Jana Barat 16170, kab. Bogor, Jawa Bar HE 1 REA
. at, 16110 AAA Ae 2 oh
083140632957 PER, ARA 7
Gucue No:6 7 5 7 7 : 7 7
: 24 Agu 2026 1:51 7 7 7 Ai
Receipt Numper 38005 5 Ep Ap 7
p Bill Name 06 5 Np 7 5
aah Collected By yunita Maida Ah 77 So
Dine In 7 AA, 7 7
Nasi Goreng Babat HOrti x Rp 40.000 2S AK aa
pedas TE Aan
Nasi Goreng Kecomprang sate..xX! Rp 55.000 Dee ES
Pedas : SES
subtota| Rp 35.000 SEE 5
PB1(1OR) Rp 9.500
Service Charge 54) Rp 4.150
ding Amount (Rp 250) :
Rp 109.000 Spare Pase
Rp 109.000 SAE
/U ?) : :`;

const dariOCR = parseReceipt(ocrAsli);
cek('OCR asli: nominal tetap 109.000', dariOCR.amount, 109000);
cek('OCR asli: ditandai tebakan (kata Total hilang)', dariOCR.ditebak, true);
cek('OCR asli: tanggal tetap terbaca', dariOCR.date, '2026-08-24');
cek('OCR asli: kategori tertebak',     dariOCR.cat, 'Makanan');
// Nomor telepon 083140632957 tidak punya pemisah ribuan, jadi tidak ikut
cek('OCR asli: bukan nomor telepon', dariOCR.amount < 1e9, true);

// Ejaan rusak yang lolos dari pola versi lama. Diuji lewat perilakunya, bukan
// dengan menyalin ulang regexnya — salinan akan cepat berbeda dari aslinya.
// TUNAI rusak yang paling berbahaya: nominalnya bisa melebihi total, jadi kalau
// lolos, cadangan akan memilih uang yang diserahkan, bukan yang dibayar.
cek('TUNA1 rusak tetap diabaikan',
  parseReceipt('TOKO\nNASI Rp 30.000\nTUNA1 Rp 50.000').amount, 30000);
cek('TUNAI utuh tetap diabaikan',
  parseReceipt('TOKO\nNASI Rp 30.000\nTUNAI Rp 50.000').amount, 30000);
cek('subtota| rusak tetap diabaikan',
  parseReceipt('TOKO\nsubtota| Rp 90.000\nNASI Rp 30.000').amount, 30000);
// Yang penting: pelonggaran ini tidak boleh ikut membuang baris total yang sah
cek('TOTAL BAYAR tidak ikut terbuang',
  parseReceipt('TOKO\nNASI Rp 30.000\nTOTAL BAYAR Rp 33.000').amount, 33000);

// ── struk mesin EDC bank ─────────────────────────
// Struk kartu memakai konvensi yang sama sekali berbeda dari struk kasir:
// singkatan bulan berbahasa Inggris, tahun dua digit, koma sebagai pemisah
// ribuan, dan nomor-nomor panjang (TRACE, BATCH, REF, RRN, PAN) yang jauh
// melebihi nominalnya. Diambil dari struk BCA sungguhan.
const strukEDC = `
HORTIKUL BREWHOUSE&KITC
KP. SUKAKARYA DS GADOG
RT 03/ RW 02
TERM# A2051636        MERC# 000885002652062
0895******80
DIMAS MAULANA
Issuer: BCA
CPAN#9360014101815991 91
PAYMENT QR    DATE/TIME 24 AUG,26 11:51
DEBIT
TRACE NO: 006103    BATCH : 000619
REF.NO. 623611006103   APPR.CODE 115144
RRN QRIS 462934444
TOTAL             Rp.109,000
*** SIGNATURE NOT REQUIRED ***
**Cardholder Copy**
`;
const edc = parseReceipt(strukEDC);
cek('EDC: total 109.000 dari koma ribuan', edc.amount, 109000);
cek('EDC: bukan tebakan',                  edc.ditebak, false);
// "24 AUG,26" — bulan Inggris, tahun dua digit, dipisah koma. Format ini dulu
// tidak dikenali sama sekali, sehingga tanggalnya diam-diam jatuh ke hari ini.
cek('EDC: tanggal "24 AUG,26"',            edc.date, '2026-08-24');

// Nomor-nomor panjang di struk kartu tidak boleh terbaca sebagai nominal.
cek('EDC: bukan nomor REF/RRN/PAN',        edc.amount < 1e6, true);

// Varian format tanggal lain yang wajar ditemui
cek('tanggal "AUG 24, 2026" (bulan dulu)',
  parseReceipt('TOKO\nAUG 24, 2026\nTOTAL 50.000').date, '2026-08-24');
cek('tanggal "24-Agu-2026" dipisah strip',
  parseReceipt('TOKO\n24-Agu-2026\nTOTAL 50.000').date, '2026-08-24');
cek('tanggal "24 Agu 2026" tetap jalan',
  parseReceipt('TOKO\n24 Agu 2026\nTOTAL 50.000').date, '2026-08-24');

// Pelonggaran pemisah tidak boleh membuat sembarang angka jadi tanggal:
// yang menjaga adalah bulannya harus benar-benar dikenali.
cek('kata bukan-bulan tidak jadi tanggal',
  parseReceipt('TOKO\nMEJA 12 Item 26\nTOTAL 50.000').date, null);
cek('nomor panjang tidak jadi tanggal',
  parseReceipt('TOKO\nREF.NO. 623611006103\nTOTAL 50.000').date, null);

// ── angka yang terpecah spasi oleh OCR ───────────
// Kasus nyata: struk BCA terbalik yang sudah berhasil diputar tegak tetap
// menghasilkan Rp 109 alih-alih Rp 109.000. Baris TOTAL-nya ditemukan dengan
// benar; yang rusak adalah angkanya — OCR menyisipkan spasi di dalamnya,
// tokenisasi memecahnya jadi '109' dan '000', lalu '000' ditolak karena di
// bawah seratus. Yang tersisa 109, dan tidak ada apa pun yang menandai bahwa
// totalnya baru saja menyusut seribu kali lipat.
cek('spasi sesudah koma disatukan',
  parseReceipt('TOKO\nTOTAL      Rp.109, 000').amount, 109000);
cek('spasi sesudah titik disatukan',
  parseReceipt('TOKO\nTOTAL      Rp.109. 000').amount, 109000);
cek('pemisah hilang, tersisa spasi',
  parseReceipt('TOKO\nTOTAL      Rp 109 000').amount, 109000);
cek('jutaan dengan dua spasi',
  parseReceipt('TOKO\nTOTAL      Rp 1 250 000').amount, 1250000);
cek('spasi sebelum koma juga',
  parseReceipt('TOKO\nTOTAL      Rp.109 ,000').amount, 109000);

// Penggabungan hanya berlaku di baris total. Kalau tidak, baris barang seperti
// 'QTY 2 500' berubah jadi 2.500 dan tebakan cadangan memilih angka karangan.
cek('baris barang tidak ikut digabung saat menebak',
  parseReceipt('TOKO\nNASI GORENG QTY 2 500\nBAYAR 30.000').amount, 30000);
cek('angka utuh tidak berubah',
  parseReceipt('TOKO\nTOTAL 109.000').amount, 109000);
cek('kelompok dua digit tidak ikut digabung',
  parseReceipt('TOKO\nTOTAL 24 AUG,26 11:51 Rp 50.000').amount, 50000);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
