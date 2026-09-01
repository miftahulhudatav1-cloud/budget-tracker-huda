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

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
