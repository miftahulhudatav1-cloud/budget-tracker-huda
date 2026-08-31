// Menguji logika baru yang diekstrak langsung dari index.html.
import fs from 'fs';
const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');

function ambil(mulaiStr, akhirStr) {
  const a = html.indexOf(mulaiStr);
  const b = html.indexOf(akhirStr, a);
  if (a === -1 || b === -1) throw new Error('Blok tidak ditemukan: ' + mulaiStr);
  return html.slice(a, b);
}

// kunciEntri — dipakai restore untuk mengenali data yang sudah ada
const kodeKunci = ambil('function kunciEntri(d)', 'window.handleRestoreFile');
// getBudgetLimits / saveBudgetLimit — penyimpanan limit per tahun
const kodeBudget = ambil('function getBudgetLimits()', 'function renderBudgetGrid()');

const mod = await import('data:text/javascript,' + encodeURIComponent(`
let settingsCache = { recurring: [], budgetLimits: {} };
let currentYear = 2026;
function simpanSettings(patch){ settingsCache = { ...settingsCache, ...patch }; }
${kodeKunci}
${kodeBudget}
export { kunciEntri, getBudgetLimits, saveBudgetLimit };
export function _set(y){ currentYear = y; }
export function _dump(){ return settingsCache; }
`));

let lulus = 0, gagal = 0;
function cek(nama, dapat, harap) {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)}  harap=${JSON.stringify(harap)}`);
}

const { kunciEntri, getBudgetLimits, saveBudgetLimit, _set, _dump } = mod;

// ── kunciEntri: entri identik harus menghasilkan kunci sama ──
const a = { date:'2026-08-01', desc:'Kopi', amount:15000, cat:'Makanan', type:'Keinginan', method:'Tunai' };
const b = { ...a, createdAt: 'SERVER_TIMESTAMP_BERBEDA' };
cek('createdAt tidak memengaruhi kunci', kunciEntri(a), kunciEntri(b));

const c = { ...a, desc: '  KOPI  ' };
cek('spasi & huruf besar diabaikan', kunciEntri(a), kunciEntri(c));

const d = { ...a, amount: 15001 };
cek('nominal beda -> kunci beda', kunciEntri(a) === kunciEntri(d), false);

const e = { ...a, method: 'Transfer' };
cek('metode beda -> kunci beda', kunciEntri(a) === kunciEntri(e), false);

// Entri pemasukan tidak punya method; tidak boleh melempar error
cek('field hilang aman', typeof kunciEntri({ date:'2026-08-01', desc:'Gaji', amount:5000000 }), 'string');

// ── Simulasi dedup restore ──
const sudahAda = new Set([a, e].map(kunciEntri));
const fileBackup = [a, e, { ...a, amount: 20000 }];
let baru = 0, lewat = 0;
for (const x of fileBackup) {
  if (sudahAda.has(kunciEntri(x))) { lewat++; continue; }
  sudahAda.add(kunciEntri(x)); baru++;
}
cek('restore ulang: 2 dilewati, 1 baru', { baru, lewat }, { baru: 1, lewat: 2 });

// ── Limit budget per tahun ──
_set(2026); saveBudgetLimit('Makanan', 500000);
cek('limit 2026 tersimpan', getBudgetLimits(), { Makanan: 500000 });

_set(2027);
cek('tahun lain tidak ikut terisi', getBudgetLimits(), {});

saveBudgetLimit('Transportasi', 300000);
_set(2026);
cek('2026 tidak tertimpa oleh 2027', getBudgetLimits(), { Makanan: 500000 });
_set(2027);
cek('2027 punya nilainya sendiri', getBudgetLimits(), { Transportasi: 300000 });

_set(2026); saveBudgetLimit('Makanan', 0);
cek('limit 0 menghapus entri', getBudgetLimits(), {});
cek('menghapus 2026 tidak merusak 2027', (_set(2027), getBudgetLimits()), { Transportasi: 300000 });

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
