// Menguji penanganan CONFIG_BAWAAN yang tertanam di index.html.
//
// Yang dijaga di sini: aplikasi tidak boleh menganggap dirinya "mode layanan"
// selama config bawaannya masih berisi placeholder. Kalau itu terjadi, ia akan
// mencoba menghubungi project yang tidak ada, dan gerbang langganan menyala
// untuk orang yang tidak seharusnya kena.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const a = html.indexOf('const CONFIG_BAWAAN = {');
const b = html.indexOf('// localStorage menang atas bawaan');
if (a === -1 || b === -1 || b <= a) { console.error('blok CONFIG_BAWAAN tidak ditemukan'); process.exit(2); }
const { bawaanBersih, adaConfigBawaan, CONFIG_BAWAAN } = await import(
  'data:text/javascript,' + encodeURIComponent(
    html.slice(a, b) + '\nexport { bawaanBersih, adaConfigBawaan, CONFIG_BAWAAN };'));

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)}  harap=${JSON.stringify(harap)}`);
};

// Kunci yang dibutuhkan harus lengkap. Kalau salah satu hilang dari CONFIG_BAWAAN,
// kode di bawahnya akan membaca undefined tanpa ada yang memberi tahu.
const wajib = ['apiKey','authDomain','projectId','appId','messagingSenderId'];
cek('semua kunci config tersedia',
  wajib.filter(k => !(k in CONFIG_BAWAAN)), []);

// Setiap placeholder harus jadi string kosong, bukan lolos sebagai nilai sah.
const bersih = bawaanBersih();
cek('placeholder apiKey jadi kosong',    bersih.apiKey, '');
cek('placeholder projectId jadi kosong', bersih.projectId, '');
// authDomain-nya berbentuk 'ISI_PROJECT_ID.firebaseapp.com' — awalannya tetap
// ISI_, jadi harus ikut dianggap belum diisi meski terlihat seperti domain asli.
cek('placeholder authDomain jadi kosong', bersih.authDomain, '');
cek('placeholder senderId jadi kosong',   bersih.messagingSenderId, '');

// Selama masih placeholder, aplikasi harus kembali ke layar setup.
cek('config bawaan masih placeholder → belum siap', adaConfigBawaan(), false);

// bawaanBersih tidak boleh mengubah CONFIG_BAWAAN aslinya.
bawaanBersih().apiKey = 'diubah';
cek('CONFIG_BAWAAN tidak ikut berubah',
  String(CONFIG_BAWAAN.apiKey).startsWith('ISI_'), true);

// ── pembersihan config tersimpan ─────────────────
// Config kotor yang sudah masuk localStorage dulu MENETAP di perangkat itu
// selamanya: pembersihan hanya berjalan saat menyimpan, dan tidak ada satu pun
// jalur yang memeriksanya lagi saat membaca. Pengisian messagingSenderId
// bahkan menulis ulang seluruh objek apa adanya. Diagnosa di HP pemilik
// menunjukkan authDomain masih membawa "https://" berhari-hari sesudahnya.
const ab = html.indexOf('function bersihkanConfig(');
const bb = html.indexOf('window.tempelConfig');
const { bersihkanConfig } = await import(
  'data:text/javascript,' + encodeURIComponent(
    html.slice(ab, bb) + '\nexport { bersihkanConfig };'));

const rapi = {
  apiKey: 'AIzaSyD-contoh', authDomain: 'proyek.firebaseapp.com',
  projectId: 'proyek', appId: '1:123:web:abc', messagingSenderId: '123456789',
};
cek('config rapi tidak berubah', bersihkanConfig(rapi), rapi);

cek('https:// di authDomain dibuang',
  bersihkanConfig({ ...rapi, authDomain: 'https://proyek.firebaseapp.com' }).authDomain,
  'proyek.firebaseapp.com');
cek('http:// juga dibuang',
  bersihkanConfig({ ...rapi, authDomain: 'http://proyek.firebaseapp.com' }).authDomain,
  'proyek.firebaseapp.com');
cek('jalur di belakang domain dibuang',
  bersihkanConfig({ ...rapi, authDomain: 'proyek.firebaseapp.com/__/auth' }).authDomain,
  'proyek.firebaseapp.com');

// Menyalin dari blok firebaseConfig ikut membawa tanda kutip dan koma.
cek('tanda kutip di ujung dibuang',
  bersihkanConfig({ ...rapi, apiKey: '"AIzaSyD-contoh"' }).apiKey, 'AIzaSyD-contoh');
cek('koma di ujung dibuang',
  bersihkanConfig({ ...rapi, projectId: 'proyek",' }).projectId, 'proyek');
cek('spasi di ujung dibuang',
  bersihkanConfig({ ...rapi, appId: '  1:123:web:abc  ' }).appId, '1:123:web:abc');

// Nilai yang hilang tidak boleh jadi "undefined" sebagai teks.
cek('field kosong jadi string kosong',
  bersihkanConfig({}).apiKey, '');
cek('objek kosong tetap punya kelima kunci',
  Object.keys(bersihkanConfig({})).sort(),
  ['apiKey','appId','authDomain','messagingSenderId','projectId']);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
