// Menguji namaFormat() dari index.html — penamaan format di pesan gagal dekode.
//
// Kecil, tapi ini satu-satunya petunjuk yang didapat pengguna ketika fotonya
// ditolak. "Format tidak didukung" tidak memberi tahu apa pun; "Format HEIC
// tidak bisa dibaca di browser ini" langsung menunjuk sebab dan jalan keluarnya.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const a = html.indexOf('function namaFormat(');
const b = html.indexOf('async function decodeImage(');
if (a === -1 || b === -1 || b <= a) { console.error('namaFormat tidak ditemukan'); process.exit(2); }
const { namaFormat } = await import(
  'data:text/javascript,' + encodeURIComponent(html.slice(a, b) + '\nexport { namaFormat };'));

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = dapat === harap;
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)}  harap=${JSON.stringify(harap)}`);
};

cek('HEIC dari iPhone',   namaFormat({ type: 'image/heic', name: 'IMG_0001.HEIC' }), 'HEIC');
cek('JPEG biasa',         namaFormat({ type: 'image/jpeg', name: 'foto.jpg' }), 'JPEG');
cek('PNG',                namaFormat({ type: 'image/png',  name: 'a.png' }), 'PNG');

// Berkas yang datang dari aplikasi Berkas sering tiba tanpa MIME type sama
// sekali; namanya jadi satu-satunya petunjuk yang tersisa.
cek('tipe kosong: pakai ekstensi',  namaFormat({ type: '', name: 'struk.heif' }), 'HEIF');
cek('tipe hilang: pakai ekstensi',  namaFormat({ name: 'struk.AVIF' }), 'AVIF');

// Tanpa petunjuk apa pun, kalimatnya harus tetap terbaca wajar:
// "Format ini tidak bisa dibaca di browser ini."
cek('tanpa tipe & tanpa ekstensi',  namaFormat({ type: '', name: 'struk' }), 'ini');
cek('objek kosong',                 namaFormat({}), 'ini');
cek('null tidak melempar error',    namaFormat(null), 'ini');

// Nama berkas dengan titik-titik tidak boleh menghasilkan "format" sepanjang
// kalimat di tengah pesan.
cek('ekstensi terlalu panjang diabaikan',
  namaFormat({ type: '', name: 'struk.terlalupanjang' }), 'ini');
cek('titik di tengah nama tetap ambil yang terakhir',
  namaFormat({ type: '', name: 'struk.24.08.2026.png' }), 'PNG');

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
