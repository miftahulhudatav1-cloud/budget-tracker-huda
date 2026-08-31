// Mencari "kabel putus": elemen/kelas/fungsi yang ditulis di satu sisi tapi tidak
// pernah tersambung di sisi lain. Pola inilah yang berulang kali menyembunyikan bug
// di aplikasi ini — panel Insight, tombol hapus mobile, dan field Nama semuanya begitu.
import fs from 'fs';

const html = fs.readFileSync(process.argv[2] + '/index.html', 'utf8');
const iScript = html.indexOf('<script type="module">');
const css  = html.slice(0, html.indexOf('</style>'));
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

// 3. class dipakai di markup tapi tidak punya aturan CSS sama sekali
const classDiHtml = uniq(
  [...body.matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/)).filter(Boolean)
).filter(c => !/^\$/.test(c));
const punyaCss = c => css.includes('.' + c);
lapor('class dipakai di HTML tapi TIDAK punya CSS', classDiHtml.filter(c => !punyaCss(c)));

// 4. class didefinisikan di CSS tapi tidak pernah muncul di markup maupun JS
const classDiCss = uniq([...css.matchAll(/\.([a-z][\w-]{3,})[\s,{:.]/g)].map(m => m[1]));
const dipakai = c => body.includes(c) || js.includes(c);
lapor('class di CSS tapi TIDAK pernah dipakai', classDiCss.filter(c => !dipakai(c)));

// 5. fungsi window.* yang tidak pernah dipanggil dari mana pun
const winFn = uniq([...js.matchAll(/window\.(\w+)\s*=\s*(?:async\s*)?function/g)].map(m => m[1]));
lapor('window.* yang tidak pernah dipanggil', winFn.filter(n => {
  const pakai = (body.match(new RegExp(n + '\\(', 'g')) || []).length
              + (js.match(new RegExp('(?<!window\\.)\\b' + n + '\\(', 'g')) || []).length;
  return pakai === 0;
}));
