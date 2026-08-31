// Menguji sumberEntri() dari index.html: tanpa kata kunci hanya bulan aktif,
// dengan kata kunci seluruh bulan di tahun berjalan.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const a = html.indexOf('function sumberEntri(type)');
const b = html.indexOf('function getFiltered(type)');
if (a === -1 || b === -1 || b <= a) { console.error('sumberEntri tidak ditemukan'); process.exit(2); }

const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

// Lingkungan tiruan untuk hal-hal yang dipakai sumberEntri.
const prelude = `
const MONTHS = ${JSON.stringify(MONTHS)};
let currentYear = 2026, currentMonth = 7;          // Agustus
let cache = {}, _q = '', _migrasi = true;
function initCache(){}
function getSearchQuery(){ return _q; }
function sudahMigrasi(){ return _migrasi; }
function urutTanggalDesc(a,b){ return String(b.date||'').localeCompare(String(a.date||'')); }
`;
const after = `
export { sumberEntri };
export function _set(o){
  if('cache' in o) cache = o.cache;
  if('q' in o) _q = o.q;
  if('migrasi' in o) _migrasi = o.migrasi;
  if('bulan' in o) currentMonth = o.bulan;
}`;
const { sumberEntri, _set } = await import(
  'data:text/javascript,' + encodeURIComponent(prelude + html.slice(a, b) + after));

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)}\n        harap=${JSON.stringify(harap)}`);
};

const buatCache = () => {
  const c = { 2026: {} };
  MONTHS.forEach(m => { c[2026][m] = { in: [], out: [] }; });
  c[2026]['Juli'].out     = [{ id:'j1', date:'2026-07-10', desc:'Kopi Juli',    amount:10000 }];
  c[2026]['Agustus'].out  = [{ id:'a1', date:'2026-08-05', desc:'Kopi Agustus', amount:20000 },
                             { id:'a2', date:'2026-08-20', desc:'Bakso',        amount:30000 }];
  c[2026]['Desember'].out = [{ id:'d1', date:'2026-12-01', desc:'Kopi Desember',amount:40000 }];
  return c;
};

// Tanpa kata kunci: hanya bulan aktif
_set({ cache: buatCache(), q: '', migrasi: true, bulan: 7 });
cek('tanpa kata kunci -> hanya Agustus',
  sumberEntri('out').map(e => e.id), ['a1','a2']);

// Dengan kata kunci: seluruh tahun, terbaru dulu
_set({ q: 'kopi' });
cek('dengan kata kunci -> seluruh tahun, terbaru dulu',
  sumberEntri('out').map(e => e.id), ['d1','a2','a1','j1']);

// Penanda bulan wajib ikut, kalau tidak hasil campuran tak terbaca
cek('tiap hasil membawa _bulan',
  sumberEntri('out').map(e => e._bulan), ['Desember','Agustus','Agustus','Juli']);

// Entri bulan aktif tidak boleh diberi penanda oleh labelBulan (diuji lewat nilainya)
cek('_bulan bulan aktif tetap Agustus',
  sumberEntri('out').filter(e => e.id === 'a1')[0]._bulan, 'Agustus');

// Sebelum migrasi selesai perilaku lama harus dipertahankan
_set({ migrasi: false });
cek('belum migrasi -> tetap hanya bulan aktif walau ada kata kunci',
  sumberEntri('out').map(e => e.id), ['a1','a2']);

// Bulan kosong tidak boleh melempar error
_set({ migrasi: true, bulan: 0 });   // Januari, kosong
cek('bulan kosong aman', sumberEntri('out').length, 4);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
