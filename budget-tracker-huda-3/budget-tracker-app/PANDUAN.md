# 📱 Panduan Setup Budget Tracker Huda

Aplikasi pencatat keuangan pribadi. Satu file HTML, tanpa `npm install`, tanpa build.
Datanya disimpan di Firebase (gratis) sehingga bisa dibuka dari HP dan laptop dengan data yang sama.

## File di folder ini

| File | Fungsi |
|---|---|
| `index.html` | Seluruh aplikasi — HTML, CSS, dan JavaScript jadi satu |
| `manifest.json` | Metadata agar bisa di-install ke HP seperti aplikasi biasa |
| `sw.js` | Service worker (butuh HTTPS, tidak aktif saat dibuka dari file lokal) |
| `vercel.json` | Mengatur `Content-Type` manifest saat di-deploy ke Vercel |
| `push/` | Penerima notifikasi latar — scope terpisah agar tidak menggantikan `sw.js` |
| `scripts/` | Pengirim pengingat harian, dijalankan GitHub Actions |
| `tests/` | Tes tanpa dependensi — lihat `tests/README.md` |
| `PANDUAN.md` | File ini |

---

## 🔥 Step 1 — Setup Firebase

Gratis selamanya untuk pemakaian pribadi (paket Spark). Sekitar 15 menit.

### 1.1 Buat project

1. Buka [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → beri nama, misal `budget-huda` → **Continue**
3. Google Analytics boleh dimatikan, tidak dipakai aplikasi ini
4. **Create project**

### 1.2 Daftarkan Web App

1. Di dashboard project, klik ikon **`</>`** (Web)

   > Pilih **Web**, bukan Android atau iOS. Aplikasi ini berjalan di browser.
   > Pemasangan ke HP nanti lewat "Add to Home Screen" (PWA), bukan lewat Play Store.

2. Beri nickname, misal `Budget Huda` → **Register app**
3. Muncul potongan kode konfigurasi. **Catat empat nilai ini** — hanya empat ini yang dibutuhkan:

   ```js
   const firebaseConfig = {
     apiKey:      "AIzaSy...",                    // ← catat
     authDomain:  "budget-huda.firebaseapp.com",  // ← catat
     projectId:   "budget-huda",                  // ← catat
     appId:       "1:123:web:abc123"              // ← catat
   };
   ```

   `storageBucket` tidak perlu. `messagingSenderId` hanya dibutuhkan bila kamu
   mengaktifkan Notifikasi Pengingat — kalau menempel seluruh blok config, nilainya
   ikut terbaca sendiri.

4. **Continue to console**

### 1.3 Aktifkan Firestore Database

1. Sidebar kiri → **Databases & Storage** → **Firestore Database**
2. **Create database**
3. Edition: **Standard** → Next
4. Database ID: biarkan `(default)`
5. Location: **`asia-southeast2 (Jakarta)`** kalau kamu di Indonesia

   > ⚠️ Lokasi **tidak bisa diubah setelah dibuat**. Pilih yang paling dekat.

6. Mode: **Start in test mode** → **Create**

   Mode ini hanya sementara; akan diganti di step 1.5.

### 1.4 Aktifkan Authentication

> **Step ini wajib.** Aplikasi memakai login email/password. Tanpa ini,
> pengguna tidak bisa mendaftar dan tidak ada data yang bisa disimpan.

1. Sidebar kiri → cari **Authentication** → **Get started**
2. Tab **Sign-in method** → pilih **Email/Password**
3. Aktifkan toggle **Enable** yang atas → **Save**

   Toggle kedua (*Email link / passwordless sign-in*) **tidak perlu diaktifkan** —
   aplikasi ini tidak memakainya.

### 1.5 Pasang security rules

Test mode membuat seluruh data bisa dibaca dan diubah siapa pun yang punya
konfigurasi, dan otomatis kedaluwarsa setelah 30 hari. Ganti sekarang:

1. **Firestore Database** → tab **Rules**
2. Hapus seluruh isinya, ganti dengan:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       // Status langganan. Pemiliknya boleh MEMBACA, tidak boleh menulis —
       // hanya service account (skrip aktifkan-langganan.mjs) yang menulis
       // ke sini, dan service account menembus seluruh aturan ini.
       match /billing/{userId} {
         allow read:  if request.auth != null && request.auth.uid == userId;
         allow write: if false;
       }

       // Data pengguna: miliknya sendiri, penuh.
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

3. **Publish**

Efeknya: setiap pengguna hanya bisa membaca dan menulis datanya sendiri, dan aturan
ini tidak punya masa kedaluwarsa.

> **Kenapa `billing` diletakkan di luar `users/`?**
> Aturan Firestore bersifat ATAU, bukan DAN — kalau ada satu aturan yang
> mengizinkan, akses diberikan. Seandainya status langganan disimpan di
> `users/{uid}/billing/status`, aturan `users/{userId}/{document=**}` di atas
> akan ikut mengizinkan pengguna menulisnya, dan siapa pun bisa mengaktifkan
> langganannya sendiri lewat konsol browser. Menaruhnya di koleksi terpisah
> adalah satu-satunya cara membuatnya benar-benar hanya-baca.
>
> Masa coba 14 hari tidak disimpan di mana pun: ia dihitung dari waktu pembuatan
> akun di Firebase Auth. Firebase yang menetapkan nilai itu dan pengguna tidak
> bisa menyentuhnya, jadi masa coba tidak bisa diulang dengan menghapus data.

---

## 💻 Step 2 — Menjalankan di komputer

Buka `index.html` langsung lewat browser sudah cukup untuk mencoba. Tapi service
worker (mode offline dan pemasangan ke HP) hanya aktif lewat HTTP/HTTPS, jadi
lebih baik jalankan server lokal:

```bash
cd budget-tracker-app
python -m http.server 8000
```

Lalu buka `http://localhost:8000`.

Belum ada Python? Install lewat `winget install Python.Python.3.12` (Windows) atau
dari [python.org](https://python.org). Kalau Windows menampilkan pesan *"Python was
not found"* padahal sudah di-install, itu alias kosong bawaan Microsoft Store —
matikan lewat **Settings → Apps → Advanced app settings → App execution aliases**.

Saat pertama dibuka, aplikasi meminta empat nilai konfigurasi dari step 1.2.
Cara paling aman: **copy seluruh blok** `const firebaseConfig = { ... }` dari
Firebase Console, tempel ke kotak **"Tempel Config Sekaligus"** paling atas, lalu
tap **Isi otomatis**. Keempat kolom terisi sendiri.

> Jangan mengetik manual kalau bisa dihindari. Autofill browser gemar
> mengembalikan nilai lama, dan `apiKey` yang tertukar dari project lain
> menghasilkan kegagalan yang membingungkan: login tetap berhasil, tapi semua
> data ditolak. Lihat bagian Masalah yang sering terjadi.

Lalu klik **Simpan & Mulai**, dan daftar akun dengan email dan password
(**minimal 6 karakter** — syarat dari Firebase). Isi juga kolom **Nama**; itu
yang dipakai sebagai judul aplikasi.

Konfigurasi tersimpan di `localStorage` browser, jadi hanya diminta sekali per
perangkat. Untuk menggantinya: menu **⋯** → **Ganti Firebase**.

### Memasang di perangkat kedua tanpa mengetik

Aplikasi menerima konfigurasi lewat tautan, jadi HP tidak perlu mengetik apa pun:

```
https://<domain-kamu>/#cfg=<base64 dari JSON config>
```

Buka tautan itu di perangkat baru, konfirmasi, selesai. Konfigurasi Firebase
memang bukan rahasia — ia selalu terlihat di halaman web mana pun yang
memakainya, dan yang menjaga datamu adalah security rules serta password akun.
Meski begitu, kirimkan hanya ke perangkatmu sendiri, jangan ke tempat publik.

---

## 🌐 Step 3 — Deploy agar bisa diakses dari mana saja

### Vercel, terhubung ke GitHub (rekomendasi)

Setiap `git push` akan otomatis men-deploy ulang.

1. [vercel.com](https://vercel.com) → **Sign Up** → **Continue with GitHub**
2. **Add New...** → **Project** → pilih repo ini → **Import**
3. **Framework Preset**: `Other`
4. **Root Directory**: arahkan ke folder yang berisi `index.html`.

   > ⚠️ Kalau `index.html` tidak berada di akar repo, Root Directory **harus**
   > diarahkan ke folder tempatnya. Kalau tidak, hasil deploy-nya 404.

5. Build & Output Settings: biarkan kosong — aplikasi ini statis, tidak perlu build
6. **Deploy**

### Alternatif: Netlify

Drag & drop folder `budget-tracker-app` ke [netlify.com](https://netlify.com).
Lebih cepat, tapi tidak otomatis ter-update saat kode berubah.

---

## 🔑 Step 4 — Daftarkan domain ke Firebase

> **Jangan dilewat.** Tanpa langkah ini, login akan gagal dengan error
> `auth/unauthorized-domain` di domain hasil deploy, padahal di `localhost` lancar.

1. Firebase Console → **Authentication** → tab **Settings**
2. **Authorized domains** → **Add domain**
3. Masukkan domain hasil deploy, misal `budget-huda.vercel.app`
   — tanpa `https://`, tanpa garis miring di akhir
4. **Add**

---

## 📷 Scan Struk

Tab **Pengeluaran** → **📷 Scan Struk** → foto struknya. Di HP, tombol ini langsung
membuka kamera belakang.

Tidak perlu setup apa pun, tidak ada API key, tidak ada biaya. Pembacaan berjalan
sepenuhnya di perangkat kamu memakai Tesseract.js — foto struk tidak pernah dikirim
ke server mana pun.

### Yang realistis bisa dan tidak bisa

Tesseract adalah OCR: ia mengubah gambar menjadi **teks mentah**, tanpa memahami
isinya. Jadi:

| Field | Terisi otomatis? |
|---|---|
| Jumlah (Rp) | Ya — dicari dari baris bertuliskan TOTAL / GRAND TOTAL |
| Tanggal | Ya — bila tercetak di struk |
| Keterangan | Ya — diambil dari nama toko di kepala struk |
| Kategori | Kadang — ditebak dari kata kunci (Indomaret → Makanan, SPBU → Transportasi) |
| Jenis & Metode Bayar | **Tidak** — tidak bisa disimpulkan dari teks, isi manual |

**Selalu periksa angkanya sebelum menekan Tambah.** OCR pada foto struk memang
sering salah baca — kertas kusut, cetakan pudar, atau pencahayaan miring bisa
membuat angka meleset. Bila nominal gagal terbaca sama sekali, aplikasi
mengatakannya terus terang alih-alih diam.

### Tips agar lebih akurat

- Letakkan struk di permukaan datar, jangan dipegang
- Foto tegak lurus dari atas, bukan menyerong
- Pastikan bagian TOTAL ikut terfoto dan tidak terpotong
- Cahaya merata, hindari bayangan tangan dan pantulan kilat

### Catatan pemakaian pertama

Scan pertama mengunduh pustaka OCR dan data bahasa Indonesia (**sekitar 5 MB**),
jadi terasa lambat. Setelah itu tersimpan di cache browser dan scan berikutnya
langsung jalan. Sebaiknya lakukan scan pertama saat terhubung Wi-Fi.

### Foto struk

Foto tersimpan **7 hari** lalu terhapus otomatis, dan bisa dibuka lewat ikon 🧾
di daftar transaksi. Foto disimpan sebagai dokumen Firestore biasa (bukan
Firebase Storage) supaya tetap muat di paket gratis Spark, sehingga dikompres
dulu di browser. Pembersihan berjalan saat aplikasi dibuka; foto juga langsung
ikut terhapus bila transaksinya dihapus. Foto **tidak** ikut dalam file Backup.

---

## 🔔 Notifikasi Pengingat (opsional)

Mengirim notifikasi ke HP tiap malam bila hari itu belum ada catatan — **juga
saat aplikasi tidak dibuka**. Kalau tidak diaktifkan, aplikasi tetap berjalan
normal; yang ada hanya banner pengingat saat aplikasi dibuka.

> **Kenapa butuh langkah sebanyak ini?** Browser tidak bisa menjadwalkan
> notifikasi untuk waktu mendatang saat aplikasinya tertutup — tidak ada API-nya.
> Jadi pengirimnya harus hidup di luar perangkat. Yang dipakai di sini gratis
> semua: GitHub Actions sebagai penjadwal, Firebase Cloud Messaging sebagai
> pengirim (gratis bahkan di paket Spark).

### 1. Ambil VAPID key

Firebase Console → ⚙️ **Project settings** → tab **Cloud Messaging** → bagian
**Web Push certificates** → **Generate key pair**. Salin nilainya.

### 2. Aktifkan di aplikasi

Menu **⋯** → **Notifikasi Pengingat**.

**Kalau config-mu dibuat sebelum fitur ini ada**, akan diminta **Messaging Sender
ID** lebih dulu — angka di antara dua titik dua pertama pada `appId`, sama dengan
**Project number** di Project settings → General:

```
1:1081632587089:web:2854ef5e...
  └────┬─────┘
   Sender ID
```

Setelah diisi, **halaman dimuat ulang sendiri**, lalu buka menu itu **sekali
lagi**. Ini perlu karena Firebase membaca config saat halaman dimuat; nilai baru
tidak terbaca oleh instance yang sudah terlanjur berjalan.

Kalau menempel seluruh blok `firebaseConfig` lewat Ganti Firebase, nilainya ikut
terbaca sendiri dan pertanyaan ini tidak muncul.

Berikutnya: tempel **VAPID key** → izinkan notifikasi saat browser bertanya.

Ulangi di tiap perangkat yang ingin menerima notifikasi. Untuk mematikan, buka
menu yang sama sekali lagi.

> **iPhone:** push hanya bekerja bila aplikasinya sudah di-**Add to Home Screen**
> dan dibuka dari ikon itu. Dari tab Safari biasa, iOS tidak mengizinkannya.

### 3. Ambil service account key

Firebase Console → ⚙️ **Project settings** → tab **Service accounts** →
**Generate new private key** → tersimpan sebagai file `.json`.

> ⚠️ **Kunci ini berbeda sifat dari config Firebase.** Config web memang publik
> dan dibatasi security rules. Service account key **menembus semua rules** dan
> membuka seluruh data semua pengguna. Jangan pernah menaruhnya di dalam repo,
> mengirimnya lewat chat, atau menempelkannya ke `index.html`.

### 4. Simpan sebagai secret GitHub

Repo di GitHub → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**

- Name: `FIREBASE_SERVICE_ACCOUNT`
- Secret: **seluruh isi** file `.json` tadi, apa adanya

### 5. Uji tanpa menunggu

Tab **Actions** → **Pengingat harian** → **Run workflow**. Log-nya menyebutkan
berapa yang diperiksa, dikirim, dan dilewati.

Setelah itu berjalan sendiri tiap hari pukul **20.00 WIB** (13:00 UTC). Untuk
mengubah jamnya, sunting baris `cron` di
`.github/workflows/pengingat-harian.yml` — nilainya selalu UTC.

### Yang perlu diketahui

- Jadwal GitHub Actions bisa **meleset beberapa menit hingga puluhan menit** saat
  layanannya sibuk. Wajar untuk pengingat.
- Workflow terjadwal **berhenti otomatis setelah 60 hari tanpa aktivitas** di
  repo. Satu commit apa pun menghidupkannya lagi.
- "Hari ini" dihitung memakai **zona waktu perangkat**, yang ikut tersimpan saat
  notifikasi diaktifkan. Tanpa itu, memakai UTC berarti tujuh jam pertama tiap
  hari di WIB dinilai sebagai hari kemarin.
- Token yang mati (aplikasi dicopot, data situs dibersihkan) dibersihkan sendiri
  saat pengiriman gagal, jadi tidak dicoba terus setiap hari.

---

## 📱 Step 5 — Install ke HP

Butuh URL HTTPS (hasil deploy), tidak bisa dari `localhost`.

**Android (Chrome):** buka link → menu **⋮** → **Install app** / **Add to Home screen**

**iPhone (Safari):** buka link → ikon **Share** → **Add to Home Screen**

---

## ☁️ Cara kerja penyimpanan

- Setiap penambahan, perubahan, atau penghapusan langsung tersimpan ke Firestore
- Indikator **"Tersimpan ☁️"** muncul saat sinkronisasi berhasil
- Data tersimpan di jalur `users/{uid}/{tahun}_{bulan}_{in|out}` — terpisah per akun
- **Transaksi rutin** dan **limit budget** di `users/{uid}/settings/app`
- Buka dari perangkat lain dengan akun yang sama — semuanya identik

### Bisa dipakai offline

Aplikasi menyimpan cache di perangkat, jadi tetap bisa dibuka dan **tetap bisa
mencatat transaksi** saat tanpa sinyal. Yang kamu tulis akan diantre dan terkirim
sendiri begitu koneksi kembali — berguna karena pengeluaran justru sering dicatat
di dalam toko.

Yang tetap butuh koneksi: **login pertama kali** di sebuah perangkat, dan
**scan struk pertama** (karena mengunduh pustaka OCR).

### Menu ⋯

Tombol yang jarang dipakai ada di menu **⋯** di kanan atas, supaya tidak memenuhi
layar HP: **Export Excel**, **Export PDF**, **Backup & Restore**,
**Diagnosa Koneksi**, **Ganti Firebase**, dan **Keluar**.

Yang tetap di luar menu adalah yang sering dilihat: pilihan tahun, status
sinkronisasi, identitas akun, dan tombol tema terang/gelap.

### Mengganti nama di judul

Ketuk judul **"Keuangan …"** untuk menggantinya. Nama ini juga terpakai sebagai
judul tab browser.

Nama aplikasi di homescreen (label di bawah ikon) **tidak** ikut berubah — itu
dibaca dari `manifest.json` saat aplikasi dipasang dan dikunci sejak saat itu.

### Mencari transaksi

Ketik di kolom pencarian: hasilnya mencakup **seluruh bulan di tahun berjalan**,
bukan hanya bulan yang sedang dibuka. Hasil dari bulan lain diberi penanda bulan.

Filter yang lebih rinci (kategori, jenis, metode, rentang tanggal) ada di balik
tombol **⚙ Filter** pada tiap tabel. Tombolnya menyala dan menampilkan jumlah
filter yang sedang aktif, supaya daftar yang tersaring tidak disangka data hilang.

### Export ke Excel

Menu **⋯** → **Export Excel** mengunduh **seluruh tahun** yang sedang dipilih
sebagai file CSV yang terbuka rapi di Excel. Nominalnya ditulis sebagai angka
polos, jadi langsung bisa dijumlah atau dibuat pivot.

### Batas budget per kategori

Ada di tab **Pengeluaran**, terlipat secara bawaan karena sembilan kategori
memenuhi layar padahal jarang diubah. Bar-nya menampilkan ringkasan (berapa limit
diset, berapa yang hampir/sudah habis), dan **peringatan budget tetap tampil di
luar lipatan** — budget yang jebol memang perlu terlihat.

### Mengubah transaksi

Klik ikon **✎** di baris transaksi untuk mengedit tanggal, jumlah, keterangan,
kategori, jenis, metode, atau catatan. Foto struk yang menempel tetap terjaga.

### Lupa password / salah ketik password

Di layar masuk ada ikon **👁** di kolom password untuk melihat apa yang diketik —
berguna karena password salah dan akun belum terdaftar memberi pesan yang mirip.

Kalau memang lupa, tap **"Lupa password?"**.

Di layar masuk ada tautan **"Lupa password?"**. Isi email, klik tautan itu, lalu
cek inbox (dan folder spam). Firebase mengirim link untuk membuat password baru.

---

## 🛟 Masalah yang sering terjadi

> **Mulai dari sini:** menu **⋯** → **🩺 Diagnosa Koneksi**. Alat itu memeriksa
> konfigurasi, sesi login, token, dan izin Firestore satu per satu, lalu
> menyebutkan mana yang bermasalah. Jauh lebih cepat daripada menebak — pesan
> error Firestore sendiri tidak membedakan penyebab yang solusinya berlainan.

**Sudah login, tapi semua data ditolak** — muncul *"Akses Firestore ditolak"* dan
angkanya nol, padahal namamu terlihat di pojok atas.

Hampir selalu **konfigurasi tercampur dari dua Firebase project**. Login hanya
memakai `apiKey` dan `authDomain`, jadi bisa berhasil memakai project A, sementara
database memakai `projectId` project B dan menolak tokennya. Rules-nya tidak salah.

Buka **Diagnosa** dan bandingkan baris `aud (project token)` dengan `projectId`.
Kalau berbeda, itu penyebabnya: ambil **keempat** nilai dari project yang sama
(menu ⋯ → Ganti Firebase), lalu **Keluar dan login lagi** — token hanya terbit
ulang saat login.

Kenali polanya: `authDomain` selalu berbentuk `{projectId}.firebaseapp.com`. Kalau
bagian depannya berbeda dari `projectId`, konfigurasinya pasti tercampur.

**Firebase Console gagal menyimpan apa pun** — muncul *"An unknown error occurred"*,
*"Database already exists"*, atau *"Error updating Email/Password"*, sementara
halaman-halamannya terbuka normal.

Ini hampir selalu **ekstensi browser** (ad blocker atau privacy extension) yang
memblokir request ke `googleapis.com`. Cirinya khas: semua operasi *baca* berhasil,
semua operasi *tulis* gagal. Buka Console lewat jendela **Incognito**
(`Ctrl+Shift+N`) — di sana ekstensi mati secara bawaan.

**`auth/unauthorized-domain` saat login di domain hasil deploy**
Domainnya belum didaftarkan. Kembali ke Step 4.

**Export PDF tidak memunculkan apa-apa**
Popup diblokir browser. Izinkan popup untuk situs ini, lalu coba lagi.

**Sudah login tapi data tidak muncul / muncul "Missing or insufficient permissions"**
Security rules belum ter-publish, atau masih memakai mode production bawaan
(`allow read, write: if false`). Ulangi Step 1.5.

---

## ❓ Pertanyaan umum

**Apakah gratis?**
Ya, untuk pemakaian pribadi. Paket Spark memberi 50.000 pembacaan dan 20.000
penulisan dokumen per hari — jauh di atas kebutuhan normal.

**Apakah data saya aman?**
Data tersimpan di infrastruktur Google. Dengan rules di Step 1.5, setiap akun
hanya bisa mengakses datanya sendiri.

**Bagaimana kalau offline?**
Data yang sudah dimuat tetap bisa dilihat. Penambahan data baru butuh koneksi.

**Bisa dipakai beberapa orang?**
Bisa. Setiap orang mendaftar akun sendiri dan datanya terpisah otomatis.

**Bagaimana cara pindah/backup data?**
Tombol **💾 Backup** di dalam aplikasi mengunduh seluruh data sebagai file JSON,
dan bisa dipulihkan lewat tombol yang sama.
