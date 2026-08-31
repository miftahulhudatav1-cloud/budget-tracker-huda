// Menguji gabungRutin() dari index.html. Sebelum ada fungsi ini, restore
// MENGGANTI seluruh daftar transaksi rutin dengan isi backup — padahal
// dialognya menjanjikan "data akan DITAMBAHKAN". Rutin yang dibuat setelah
// backup itu lenyap tanpa peringatan apa pun.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const a = html.indexOf('function kunciRutin(');
const b = html.indexOf('window.addRecurring');
if (a === -1 || b === -1 || b <= a) { console.error('gabungRutin tidak ditemukan'); process.exit(2); }
const { gabungRutin, kunciRutin } = await import(
  'data:text/javascript,' + encodeURIComponent(
    html.slice(a, b) + '\nexport { gabungRutin, kunciRutin };'));

let lulus = 0, gagal = 0;
const cek = (nama, dapat, harap) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap);
  ok ? lulus++ : gagal++;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}`);
  if (!ok) console.log(`        dapat=${JSON.stringify(dapat)}\n        harap=${JSON.stringify(harap)}`);
};

const kos   = { id: 1000, name: 'Bayar Kos',   amount: 1200000, type: 'Tetap', cat: 'Rumah',    day: 1 };
const wifi  = { id: 2000, name: 'Wifi',        amount: 300000,  type: 'Tetap', cat: 'Utilitas', day: 5 };
const gaji  = { id: 3000, name: 'Gaji',        amount: 8000000, type: 'Tetap', cat: 'Gaji',     day: 25 };

// ── inti masalahnya ──────────────────────────────
const hasil = gabungRutin([kos, wifi], [gaji]);
cek('yang sudah ada TIDAK hilang', hasil.length, 3);
cek('urutannya: yang ada dulu, lalu tambahan',
  hasil.map(r => r.name), ['Bayar Kos', 'Wifi', 'Gaji']);

// ── tidak menggandakan ───────────────────────────
cek('backup berisi rutin yang sudah ada → dilewati',
  gabungRutin([kos, wifi], [kos, wifi]).length, 2);

// Id berbeda tapi isinya sama: ini yang terjadi ketika rutin yang sama dibuat
// di dua perangkat. Mencocokkan lewat id akan menggandakannya.
cek('isi sama tapi id berbeda tetap dianggap sama',
  gabungRutin([kos], [{ ...kos, id: 999999 }]).length, 1);

cek('beda nominal dianggap rutin lain',
  gabungRutin([kos], [{ ...kos, id: 7, amount: 1500000 }]).length, 2);
cek('beda tanggal dianggap rutin lain',
  gabungRutin([kos], [{ ...kos, id: 7, day: 15 }]).length, 2);
cek('beda huruf besar-kecil dianggap sama',
  gabungRutin([kos], [{ ...kos, id: 7, name: 'BAYAR KOS' }]).length, 1);
cek('spasi di ujung nama dianggap sama',
  gabungRutin([kos], [{ ...kos, id: 7, name: '  Bayar Kos  ' }]).length, 1);

// ── tabrakan id ──────────────────────────────────
// Id juga menandai kapan rutin dibuat. Dua rutin dengan id sama membuat
// bulanTerlewat() salah menghitung, dan hapus-berdasarkan-id akan menghapus
// keduanya sekaligus.
const tabrak = gabungRutin([kos], [{ ...gaji, id: 1000 }]);
cek('tabrakan id: keduanya tetap masuk', tabrak.length, 2);
cek('tabrakan id: id dibuat unik', tabrak[0].id !== tabrak[1].id, true);
cek('tabrakan id: yang lama tidak diubah', tabrak[0].id, 1000);

const tanpaId = gabungRutin([], [{ name: 'Listrik', amount: 200000, type: 'Tetap', cat: 'Utilitas', day: 10 }]);
cek('rutin tanpa id diberi id', typeof tanpaId[0].id, 'number');

// Semua id harus unik meski backup penuh tabrakan
const banyak = gabungRutin([kos], [
  { ...gaji, id: 1000 },
  { ...wifi, id: 1000 },
]);
cek('banyak tabrakan sekaligus: semua id unik',
  new Set(banyak.map(r => r.id)).size, banyak.length);

// ── masukan rusak: tidak boleh melempar error ────
// Berkas backup datang dari luar. Satu entri rusak tidak boleh menggagalkan
// seluruh restore dan membuat pengguna mengira datanya tidak bisa dipulihkan.
cek('backup bukan array → daftar sekarang utuh',
  gabungRutin([kos], null).length, 1);
cek('daftar sekarang null → tetap jalan',
  gabungRutin(null, [kos]).length, 1);
cek('keduanya kosong', gabungRutin(null, null), []);
cek('entri null di dalam backup dilewati',
  gabungRutin([], [null, kos, undefined, 'bukan objek']).length, 1);

// Masukan asli tidak boleh ikut berubah — restore yang gagal di tengah jalan
// tidak boleh meninggalkan daftar yang sudah tercemar sebagian.
const asli = [kos];
gabungRutin(asli, [gaji]);
cek('daftar asli tidak ikut berubah', asli.length, 1);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
