// Menguji lapisan data yang diekstrak dari index.html: kunci periode, pembungkus
// dokumen, dan pengurutan tanggal yang kini dilakukan di sisi klien.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const a = html.indexOf('function periodeKey(');
const b = html.indexOf('// Menyisir seluruh koleksi lama');
if (a === -1 || b === -1 || b <= a) { console.error('Blok model data tidak ditemukan'); process.exit(2); }

// oldCol/txCol butuh Firestore; hanya helper murni yang diuji.
const kode = html.slice(a, b)
  .replace(/function oldCol\([^\n]*\n/, '')
  .replace(/function sudahMigrasi\([^\n]*\n/, '');

const { periodeKey, bungkusTx, urutTanggalDesc } = await import(
  'data:text/javascript,' + encodeURIComponent(kode + '\nexport { periodeKey, bungkusTx, urutTanggalDesc };')
);

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)}\n        harap=${JSON.stringify(harap)}`);
};

cek('kunci periode', periodeKey(2026, 'Agustus', 'in'), '2026-Agustus-in');
cek('tahun string == tahun number',
  periodeKey('2026', 'Agustus', 'out'), periodeKey(2026, 'Agustus', 'out'));

const entri = { date: '2026-08-31', desc: 'Kopi', amount: 15000, cat: 'Makanan', note: '' };
const tx = bungkusTx(entri, 2026, 'Agustus', 'out');

cek('field asli dipertahankan',
  { date: tx.date, desc: tx.desc, amount: tx.amount, cat: tx.cat },
  { date: '2026-08-31', desc: 'Kopi', amount: 15000, cat: 'Makanan' });
cek('field penanda ditambahkan',
  { year: tx.year, month: tx.month, flow: tx.flow, periode: tx.periode },
  { year: 2026, month: 'Agustus', flow: 'out', periode: '2026-Agustus-out' });

// Firestore membedakan 2026 dari "2026": kalau tersimpan sebagai string,
// where('year','==',2026) tidak menemukan apa pun dan rekap tahunan jadi kosong.
cek('year selalu number walau masukannya string',
  typeof bungkusTx(entri, '2026', 'Agustus', 'in').year, 'number');
cek('receiptId ikut terbawa',
  bungkusTx({ ...entri, receiptId: 'abc123' }, 2026, 'Agustus', 'out').receiptId, 'abc123');

const acak = [
  { date: '2026-08-01', desc: 'a' },
  { date: '2026-08-31', desc: 'c' },
  { date: '2026-08-15', desc: 'b' },
];
cek('urut terbaru dulu', [...acak].sort(urutTanggalDesc).map(x => x.desc), ['c','b','a']);
cek('tanggal kosong tidak melempar error',
  [...acak, { desc: 'x' }].sort(urutTanggalDesc).map(x => x.desc), ['c','b','a','x']);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
