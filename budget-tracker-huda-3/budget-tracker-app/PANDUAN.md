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

   `storageBucket` dan `messagingSenderId` tidak perlu — aplikasi ini hanya memakai
   Authentication dan Firestore.

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
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

3. **Publish**

Efeknya: setiap pengguna hanya bisa membaca dan menulis datanya sendiri, dan aturan
ini tidak punya masa kedaluwarsa.

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
Isi, klik **Simpan & Mulai**, lalu daftar akun dengan email dan password
(**minimal 6 karakter** — syarat dari Firebase).

Konfigurasi tersimpan di `localStorage` browser, jadi hanya diminta sekali per
perangkat. Untuk menggantinya, pakai tombol **Ganti Firebase** di dalam aplikasi.

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

### Mengubah transaksi

Klik ikon **✎** di baris transaksi untuk mengedit tanggal, jumlah, keterangan,
kategori, jenis, metode, atau catatan. Foto struk yang menempel tetap terjaga.

### Lupa password

Di layar masuk ada tautan **"Lupa password?"**. Isi email, klik tautan itu, lalu
cek inbox (dan folder spam). Firebase mengirim link untuk membuat password baru.

---

## 🛟 Masalah yang sering terjadi

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
