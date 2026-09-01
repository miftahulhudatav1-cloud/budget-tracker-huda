// Menguji ukuranOCR() dari index.html — penentu berapa besar gambar yang
// akhirnya dibaca Tesseract.
//
// Di sinilah bug yang membuat nama toko selalu salah baca. Skalanya dulu
// dibatasi Math.min(1, …), sehingga gambar HANYA pernah diperkecil dan tidak
// pernah diperbesar; pemotongan struk pun dilakukan 1:1 di akhir. Foto 1200x1600
// dengan struk mengisi 45% bingkai hanya menyisakan ~540x900 piksel untuk
// struknya — sekitar 13 piksel per huruf. Di bawah itu Tesseract mulai memecah
// kata: 'HORTIKUL' terbaca 'HORT TKUL', 'H' terbaca 'A'. Tidak ada apa pun yang
// menandakan bahwa gambarnya terlalu kecil; hasilnya sekadar terlihat buruk.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const iKonst = html.indexOf('const MAKS_SISI_OCR');
const a = html.indexOf('// Ukuran akhir gambar OCR.');
const b = html.indexOf('function kanvasDari(');
if (iKonst === -1 || a === -1 || b === -1 || b <= a) {
  console.error('blok ukuranOCR tidak ditemukan'); process.exit(2);
}
// Konstanta diambil dari berkas yang sama, jadi tesnya ikut bergerak bila
// nilainya diubah — bukan menyalin angkanya dan diam-diam jadi berbeda.
const konst = html.slice(iKonst, html.indexOf('let pendingReceipt'));
const { ukuranOCR, MAKS_SISI_OCR, MAKS_PEMBESARAN } = await import(
  'data:text/javascript,' + encodeURIComponent(
    konst + html.slice(a, b) +
    '\nexport { ukuranOCR, MAKS_SISI_OCR, MAKS_PEMBESARAN };'));

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)}  harap=${JSON.stringify(harap)}`);
};

// ── inti perbaikannya ────────────────────────────
// Potongan struk yang kecil HARUS diperbesar. Ini kasus yang dulu gagal.
const kecil = ukuranOCR(540, 900);
cek('potongan kecil diperbesar, bukan dibiarkan', kecil.skala > 1, true);
cek('sisi panjang mencapai batas OCR', kecil.dh, MAKS_SISI_OCR);
cek('rasio bentuknya terjaga', Math.round(kecil.dw / kecil.dh * 100), Math.round(540 / 900 * 100));

// ── batas atas ───────────────────────────────────
// Memperbesar melebihi batas hanya mengarang piksel: menambah waktu baca tanpa
// menambah keterbacaan.
const mungil = ukuranOCR(200, 300);
cek('pembesaran dibatasi', mungil.skala, MAKS_PEMBESARAN);
cek('tidak melampaui batas pembesaran', mungil.dh, 300 * MAKS_PEMBESARAN);

// ── gambar besar tetap diperkecil ────────────────
const besar = ukuranOCR(3000, 4000);
cek('gambar besar diperkecil', besar.skala < 1, true);
cek('sisi panjang tepat di batas', besar.dh, MAKS_SISI_OCR);

// Yang sudah pas dibiarkan apa adanya
cek('tepat sebesar batas: tidak diubah', ukuranOCR(1950, MAKS_SISI_OCR).dh, MAKS_SISI_OCR);

// ── bentuk melintang ─────────────────────────────
// Sisi TERPANJANG yang dipatok, bukan tingginya — struk yang difoto miring
// 90 derajat lebih lebar daripada tinggi.
const melintang = ukuranOCR(900, 540);
cek('melintang: sisi panjang yang dipatok', melintang.dw, MAKS_SISI_OCR);
cek('melintang: tidak melebihi batas', melintang.dh <= MAKS_SISI_OCR, true);

// ── masukan yang tidak wajar tidak boleh melempar ──
cek('nol tidak menghasilkan NaN', ukuranOCR(0, 0), { skala: 1, dw: 1, dh: 1 });
cek('satu sisi nol tetap aman', ukuranOCR(0, 900).dh > 0, true);
cek('ukuran tidak pernah nol', ukuranOCR(1, 1).dw >= 1, true);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
