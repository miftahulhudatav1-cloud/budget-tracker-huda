// Mencari "kabel putus": elemen/kelas/fungsi yang ditulis di satu sisi tapi tidak
// pernah tersambung di sisi lain. Pola inilah yang berulang kali menyembunyikan bug
// di aplikasi ini — panel Insight, tombol hapus mobile, dan field Nama semuanya begitu.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const iScript = html.indexOf('<script type="module">');
// Ekspor PDF membuka jendela baru dengan <style> miliknya sendiri, ditulis
// sebagai template literal `const styles = ...` di dalam JS. Tanpa ikut dibaca
// di sini, seluruh kelas laporan PDF (badge-in, total-row, cards, section-title,
// footer) dilaporkan tidak punya CSS padahal punya.
function gayaPdf(teks) {
  const i = teks.indexOf('const styles = `');
  if (i === -1) return '';
  const j = teks.indexOf('`;', i);
  return j === -1 ? '' : teks.slice(i, j);
}
// Komentar CSS ikut dibuang, dengan alasan yang sama seperti pada JS di bawah:
// catatan yang MENYEBUT nama kelas — biasanya justru catatan yang menjelaskan
// kenapa kelas itu dihapus — terbaca sebagai aturan yang masih ada, lalu
// dilaporkan sebagai CSS mati yang tidak pernah bisa dibersihkan karena
// aturannya memang sudah tidak ada.
const css  = (html.slice(0, html.indexOf('</style>')) + gayaPdf(html))
  .replace(/\/\*[\s\S]*?\*\//g, ' ');
const body = html.slice(html.indexOf('<body'), iScript);
const js   = html.slice(iScript);

const uniq = a => [...new Set(a)];
const lapor = (judul, list) => {
  console.log(`\n── ${judul} (${list.length}) ──`);
  console.log(list.length ? '  ' + list.join('\n  ') : '  (tidak ada)');
};

// 1. id yang dicari JS tapi tidak ada di markup
const idDiHtml = new Set(uniq([...html.matchAll(/id="([\w-]+)"/g)].map(m => m[1])));
const idDicariJs = uniq([...js.matchAll(/getElementById\(['"`]([\w-]+)['"`]\)/g)].map(m => m[1]));
lapor('id dicari JS tapi TIDAK ADA di HTML', idDicariJs.filter(i => !idDiHtml.has(i)));

// 2. onclick/onchange yang memanggil fungsi yang tidak pernah didefinisikan
const fnDipanggil = uniq([...body.matchAll(/on(?:click|change)="(?:event\.\w+\(\);)?\s*(?:window\.)?([\w]+)\(/g)].map(m => m[1]));
const adaFn = n => new RegExp(`(window\\.${n}\\s*=|function\\s+${n}\\s*\\()`).test(js);
lapor('fungsi dipanggil dari HTML tapi TIDAK didefinisikan', fnDipanggil.filter(n => !adaFn(n)));

// 3. class dipakai tapi tidak punya aturan CSS sama sekali
//
// Markup statis SAJA tidak cukup. Hampir seluruh tampilan aplikasi ini dirender
// dari template literal di dalam JS, dan versi pertama audit ini hanya memindai
// <body> — sehingga enam kelas tampilan mobile (.entry-card, .entry-list,
// .entry-info, .entry-desc, .entry-meta, .entry-amount) lolos tanpa satu pun
// aturan CSS. Yang tampil di layar kecil hanyalah div polos bertumpuk, dan
// audit ini melaporkannya bersih.
function kelasDari(teks) {
  const keluar = [];
  for (const m of teks.matchAll(/class="([^"]*)"/g)) {
    let isi = m[1];
    // Nama kelas sering bersembunyi di dalam ekspresi:
    //   class="entry-card ${isIn?'entry-in':'entry-out'} ${i===0?'new-row':''}"
    // Ambil dulu string di dalamnya, baru buang ekspresinya.
    for (const q of isi.matchAll(/\$\{[^}]*\}/g)) {
      for (const lit of q[0].matchAll(/['"]([^'"]*)['"]/g)) keluar.push(...lit[1].split(/\s+/));
    }
    keluar.push(...isi.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/));
  }
  // classList.add('x') / classList.toggle('x', ...) / className = 'x y'
  for (const m of teks.matchAll(/classList\.(?:add|toggle|remove)\(\s*['"]([^'"]+)['"]/g)) keluar.push(m[1]);
  for (const m of teks.matchAll(/className\s*=\s*['"`]([^'"`$]+)['"`]/g)) keluar.push(...m[1].split(/\s+/));
  return keluar;
}
const classDipakai = uniq([...kelasDari(body), ...kelasDari(js)])
  .filter(c => /^[a-zA-Z][\w-]*$/.test(c));
const punyaCss = c => css.includes('.' + c);
lapor('class dipakai tapi TIDAK punya CSS', classDipakai.filter(c => !punyaCss(c)));

// 4. class didefinisikan di CSS tapi tidak pernah muncul di markup maupun JS
const classDiCss = uniq([...css.matchAll(/\.([a-z][\w-]{3,})[\s,{:.]/g)].map(m => m[1]));
// Komentar dibuang lebih dulu. Sebuah komentar yang MENYEBUT nama kelas —
// misalnya catatan yang menjelaskan kenapa kelas itu dibuang — akan dihitung
// sebagai pemakaian oleh pencocokan substring, sehingga CSS mati tetap lolos
// justru karena kita repot-repot mendokumentasikannya.
const jsTanpaKomentar = js.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
const dipakai = c => body.includes(c) || jsTanpaKomentar.includes(c);
lapor('class di CSS tapi TIDAK pernah dipakai', classDiCss.filter(c => !dipakai(c)));

// 5. fungsi window.* yang tidak pernah dipanggil dari mana pun
const winFn = uniq([...js.matchAll(/window\.(\w+)\s*=\s*(?:async\s*)?function/g)].map(m => m[1]));
lapor('window.* yang tidak pernah dipanggil', winFn.filter(n => {
  // Pemanggilan berawalan window. dulu SENGAJA dikecualikan, agaknya untuk
  // melewati baris definisinya. Tapi definisinya berbentuk `window.nama =
  // function(`, yang tidak pernah cocok dengan pola `nama(` — jadi yang
  // terkecualikan justru pemanggilan yang sungguhan. renderInsights dilaporkan
  // mati berkali-kali padahal dipanggil lima kali.
  const pakai = (body.match(new RegExp(n + '\\(', 'g')) || []).length
              + (jsTanpaKomentar.match(new RegExp('\\b' + n + '\\(', 'g')) || []).length;
  return pakai === 0;
}));
