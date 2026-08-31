# Tes

Tanpa dependensi — hanya butuh Node. Tidak ada `npm install`, aplikasinya sendiri
tetap satu file statis.

```bash
cd budget-tracker-app
for f in tests/*.test.mjs; do node "$f" .; done
node tests/audit-wiring.mjs .
```

Di PowerShell:

```powershell
Get-ChildItem tests\*.test.mjs | ForEach-Object { node $_.FullName . }
node tests\audit-wiring.mjs .
```

## Kenapa tesnya membaca `index.html`

Setiap tes **mengekstrak fungsi yang diujinya langsung dari `index.html`**, bukan
dari salinan terpisah. Jadi yang diuji benar-benar kode yang dikirim ke pengguna —
salinan terpisah akan cepat berbeda tanpa ketahuan.

Konsekuensinya: kalau nama fungsi atau penanda blok di `index.html` diubah, tesnya
akan gagal menemukannya dan berhenti dengan kode keluar 2. Itu disengaja — lebih
baik berisik daripada diam-diam menguji kode lama.

| Berkas | Yang diuji |
|---|---|
| `parser-struk.test.mjs` | Pembacaan struk hasil OCR: nominal total (bukan TUNAI/KEMBALI/PPN), tanggal, nama toko, tebakan kategori |
| `dedup-dan-budget.test.mjs` | Kunci anti-duplikat saat restore, dan limit budget per tahun |
| `export-csv.test.mjs` | Escaping CSV — titik koma, kutip, baris baru |
| `audit-wiring.mjs` | Mencari "kabel putus": id/fungsi/kelas yang ditulis di satu sisi tapi tak tersambung di sisi lain |

## Kenapa `audit-wiring.mjs` ada

Aplikasi ini berulang kali menyembunyikan bug berbentuk sama: sesuatu ditulis di
markup tapi tidak pernah tersambung ke kode, dan gagal tanpa suara. Panel Insight
menulis ke elemen yang tidak ada, tombol hapus di tampilan HP tidak punya CSS,
kolom Nama saat daftar diisi lalu dibuang, dan tombol Export Excel memanggil fungsi
yang tidak pernah ditulis. Audit ini menangkap seluruh kelas kesalahan itu sekaligus.

Bagian "class di CSS tapi TIDAK pernah dipakai" bisa memunculkan positif palsu bila
nama kelasnya kebetulan disebut di dalam komentar. Sisanya seharusnya selalu kosong.
