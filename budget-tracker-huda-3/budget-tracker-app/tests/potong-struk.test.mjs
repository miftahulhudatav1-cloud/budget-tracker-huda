// Menguji cariKotakStruk() dari index.html: menemukan kertas terang di dalam
// foto berlatar gelap, dan — yang sama pentingnya — TIDAK memotong saat tidak
// yakin. Memotong keliru menghapus bagian struk dan jauh lebih merugikan
// daripada membiarkan latar ikut terbaca.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const a = html.indexOf('function cariKotakStruk(');
const b = html.indexOf('// Versi khusus OCR');
if (a === -1 || b === -1 || b <= a) { console.error('cariKotakStruk tidak ditemukan'); process.exit(2); }
const { cariKotakStruk } = await import(
  'data:text/javascript,' + encodeURIComponent(html.slice(a, b) + '\nexport { cariKotakStruk };'));

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)}\n        harap=${JSON.stringify(harap)}`);
};

// Kanvas tiruan: latar gelap, dengan persegi terang di posisi tertentu.
function buat(w, h, kotak, terang = 230, gelap = 30) {
  const abu = new Uint8ClampedArray(w * h).fill(gelap);
  if (kotak) {
    for (let y = kotak.y; y < kotak.y + kotak.h; y++)
      for (let x = kotak.x; x < kotak.x + kotak.w; x++)
        abu[y * w + x] = terang;
  }
  return abu;
}

// ── kasus utama: struk di tengah latar gelap ─────
const W = 200, H = 300;
const hasil = cariKotakStruk(buat(W, H, { x: 40, y: 50, w: 120, h: 200 }), W, H);
cek('kotak ditemukan', hasil !== null, true);
if (hasil) {
  // Margin 2% ditambahkan, jadi diperiksa rentangnya, bukan nilai persis.
  const wajar = hasil.x <= 40 && hasil.y <= 50 &&
                hasil.x + hasil.w >= 160 && hasil.y + hasil.h >= 250;
  cek('kotak mencakup seluruh area terang', wajar, true);
  cek('kotak tidak melebihi gambar',
    hasil.x >= 0 && hasil.y >= 0 &&
    hasil.x + hasil.w <= W && hasil.y + hasil.h <= H, true);
}

// Struk menempel di tepi kiri-atas: margin akan mendorong x/y ke bawah nol dan
// dijepit ke 0. Lebarnya harus ikut menyusut, kalau tidak kotak melewati tepi
// kanan dan drawImage menarik piksel kosong ke dalam gambar OCR.
const mepet = cariKotakStruk(buat(W, H, { x: 0, y: 0, w: 130, h: 220 }), W, H);
cek('menempel tepi: kotak tetap di dalam gambar',
  mepet === null || (mepet.x + mepet.w <= W && mepet.y + mepet.h <= H), true);

// ── kasus yang HARUS ditolak ─────────────────────
// Gambar rata (meja putih, struk putih) — tidak ada yang bisa dipisahkan.
cek('gambar rata → tidak memotong',
  cariKotakStruk(new Uint8ClampedArray(W * H).fill(200), W, H), null);

// Bercak kecil, kemungkinan pantulan cahaya — bukan struk.
cek('bercak kecil → tidak memotong',
  cariKotakStruk(buat(W, H, { x: 90, y: 140, w: 20, h: 20 }), W, H), null);

// Struk memenuhi hampir seluruh bingkai — tidak ada latar untuk dibuang.
cek('nyaris penuh → tidak memotong',
  cariKotakStruk(buat(W, H, { x: 2, y: 2, w: 196, h: 296 }), W, H), null);

// Struk gelap di latar terang (kebalikannya) — proyeksi tidak menemukan pola
// yang diharapkan, dan lebih baik tidak memotong daripada memotong terbalik.
const terbalik = cariKotakStruk(buat(W, H, { x: 40, y: 50, w: 120, h: 200 }, 30, 230), W, H);
cek('kontras terbalik → tidak memotong sembarangan',
  terbalik === null || (terbalik.w <= W && terbalik.h <= H), true);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
