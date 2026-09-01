// Menguji modePasang() dari index.html — penentu petunjuk pemasangan apa yang
// ditampilkan kepada siapa.
//
// Deteksi platform adalah tempat yang paling mudah salah, dan salahnya berupa
// petunjuk yang mustahil diikuti: menyuruh pengguna Chrome di iPhone mencari
// menu Safari yang tidak ada di sana, atau mengajak memasang aplikasi yang
// sudah terpasang.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const a = html.indexOf('function modePasang(');
const b = html.indexOf('let promptPasang = null;');
if (a === -1 || b === -1 || b <= a) { console.error('modePasang tidak ditemukan'); process.exit(2); }
// modePasang menyentuh navigator.maxTouchPoints untuk membedakan iPad modern
// dari Mac. Di Node tidak ada navigator, dan pengecekannya sudah dijaga
// `typeof navigator !== 'undefined'` — jadi cukup dibiarkan tidak ada.
const { modePasang } = await import(
  'data:text/javascript,' + encodeURIComponent(html.slice(a, b) + '\nexport { modePasang };'));

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = dapat === harap;
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)}  harap=${JSON.stringify(harap)}`);
};

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1',
  iphoneFirefox:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15',
  androidChrome:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  desktop:      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

// ── sudah terpasang: jangan pernah mengajak lagi ──
cek('sudah terpasang di iPhone',
  modePasang({ ua: UA.iphoneSafari, standalone: true }), 'sudah');
cek('sudah terpasang, tawaran browser diabaikan',
  modePasang({ ua: UA.androidChrome, standalone: true, adaPrompt: true }), 'sudah');

// ── tawaran browser selalu menang ────────────────
// Satu ketukan, tanpa perlu menjelaskan menu apa pun.
cek('Android dengan tawaran → tombol',
  modePasang({ ua: UA.androidChrome, adaPrompt: true }), 'tombol');
cek('desktop dengan tawaran → tombol',
  modePasang({ ua: UA.desktop, adaPrompt: true }), 'tombol');

// ── iOS ──────────────────────────────────────────
cek('iPhone Safari → panduan',
  modePasang({ ua: UA.iphoneSafari }), 'panduan-ios');

// Di iOS hanya Safari yang bisa memasang PWA. Menampilkan panduan Safari kepada
// pengguna Chrome/Firefox berarti menyuruh mencari menu yang tidak ada di sana.
cek('iPhone Chrome → suruh buka Safari',
  modePasang({ ua: UA.iphoneChrome }), 'buka-safari');
cek('iPhone Firefox → suruh buka Safari',
  modePasang({ ua: UA.iphoneFirefox }), 'buka-safari');

// ── yang tidak perlu diajak ──────────────────────
cek('Android tanpa tawaran → diam',
  modePasang({ ua: UA.androidChrome }), 'tidak');
cek('desktop tanpa tawaran → diam',
  modePasang({ ua: UA.desktop }), 'tidak');

// ── masukan kosong tidak boleh melempar ──────────
cek('tanpa argumen sama sekali', modePasang(), 'tidak');
cek('objek kosong',              modePasang({}), 'tidak');
cek('ua kosong',                 modePasang({ ua: '' }), 'tidak');

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
