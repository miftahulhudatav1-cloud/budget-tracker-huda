// Menguji csvEscape yang tertanam di index.html.
import fs from 'fs';
const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const a = html.indexOf('function csvEscape(v)');
const b = html.indexOf('window.exportToExcel');
if (a === -1 || b === -1) { console.error('csvEscape tidak ditemukan'); process.exit(2); }
const { csvEscape } = await import('data:text/javascript,' +
  encodeURIComponent(html.slice(a, b) + '\nexport { csvEscape };'));

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = dapat === harap;
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)} harap=${JSON.stringify(harap)}`);
};

cek('teks biasa tidak dikutip',      csvEscape('Kopi'), 'Kopi');
cek('angka jadi string',             csvEscape(30000), '30000');
cek('null jadi kosong',              csvEscape(null), '');
cek('undefined jadi kosong',         csvEscape(undefined), '');
// Pemisahnya titik koma, jadi justru titik koma yang wajib dikutip — bukan koma.
cek('titik koma dikutip',            csvEscape('Beli A; B'), '"Beli A; B"');
cek('koma TIDAK perlu dikutip',      csvEscape('Rp 1,5 juta'), 'Rp 1,5 juta');
cek('kutip digandakan',              csvEscape('Kopi "susu"'), '"Kopi ""susu"""');
cek('baris baru dikutip',            csvEscape('baris1\nbaris2'), '"baris1\nbaris2"');
cek('CR dikutip',                    csvEscape('a\rb'), '"a\rb"');

// ── sel yang diawali tanda rumus ─────────────────
// Excel membaca sel yang diawali = + - @ sebagai RUMUS. Keterangan yang sangat
// wajar seperti "-Belanja" langsung jadi sel error, dan rumus yang disusun
// sengaja bisa dijalankan saat berkasnya dibuka.
cek('diawali minus diberi apostrof',  csvEscape('-Belanja bulanan'), "'-Belanja bulanan");
cek('diawali sama dengan',            csvEscape('=1+1'), "'=1+1");
cek('diawali plus',                   csvEscape('+ ongkir'), "'+ ongkir");
cek('diawali at',                     csvEscape('@rumah'), "'@rumah");
cek('diawali tab',                    csvEscape('\tkopi'), "'\tkopi");
cek('rumus berbahaya dilumpuhkan',
  csvEscape('=HYPERLINK("http://jahat","klik")'),
  '"\'=HYPERLINK(""http://jahat"",""klik"")"');

// Tanda itu hanya berbahaya di AWAL sel, bukan di tengah.
cek('minus di tengah dibiarkan',      csvEscape('Bayar 10-12 Agustus'), 'Bayar 10-12 Agustus');
cek('sama dengan di tengah dibiarkan',csvEscape('A=B'), 'A=B');

// Kolom Jumlah harus tetap angka, kalau tidak Excel tidak bisa menjumlahnya.
cek('angka negatif tetap polos',      csvEscape(-5000), '-5000');
cek('nol tetap polos',                csvEscape(0), '0');

// Satu baris utuh harus terurai kembali persis seperti aslinya
const asli = ['Agustus', '2026-08-31', 'Pengeluaran', 'Sate; ayam', 'Makanan', '', 'Tunai', 'pakai "diskon"', 44400];
const baris = asli.map(csvEscape).join(';');
function parseCsvLine(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ';') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur); return out;
}
cek('baris utuh terurai kembali', JSON.stringify(parseCsvLine(baris)),
    JSON.stringify(asli.map(v => String(v))));

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
