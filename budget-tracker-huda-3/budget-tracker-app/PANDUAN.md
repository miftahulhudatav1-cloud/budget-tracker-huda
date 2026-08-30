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
| `api/scan-receipt.js` | Serverless function pembaca struk (lihat Step 5) |
| `package.json` | Dependensi untuk serverless function saja — aplikasinya tetap tanpa build |
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

## 📷 Step 5 — Aktifkan Scan Struk (opsional)

Fitur ini membaca foto struk dan mengisi form pengeluaran otomatis. Kalau tidak
diaktifkan, aplikasi tetap berjalan normal — tombol scan hanya akan menampilkan
pesan bahwa fiturnya belum dikonfigurasi.

> **Kenapa butuh serverless function?** API key tidak boleh ditaruh di
> `index.html` — siapa pun bisa melihatnya lewat View Source dan memakainya atas
> tagihan kamu. `api/scan-receipt.js` berjalan di server Vercel, tempat key
> disimpan sebagai Environment Variable dan tidak pernah dikirim ke browser.

### 5.1 Ambil API key Anthropic

1. Buka [console.anthropic.com](https://console.anthropic.com) → daftar
2. Isi saldo (fitur ini berbayar per pemakaian — lihat perkiraan biaya di bawah)
3. **API Keys** → **Create Key** → salin nilainya

### 5.2 Pasang key di Vercel

1. Dashboard Vercel → pilih project → **Settings** → **Environment Variables**
2. Tambah variabel:
   - Name: `ANTHROPIC_API_KEY`
   - Value: key dari step 5.1
   - Environment: centang **Production**, **Preview**, dan **Development**
3. **Save**
4. **Deployments** → deployment terbaru → **Redeploy**

   > Environment variable hanya terbaca saat deployment dibuat. Tanpa redeploy,
   > fiturnya tetap melaporkan "belum dikonfigurasi".

### 5.3 Cara pakai

Buka tab **Pengeluaran** → **📷 Scan Struk** → foto struknya. Di HP tombol ini
langsung membuka kamera belakang. Setelah 5–15 detik, field tanggal, jumlah,
keterangan, kategori, jenis, dan metode bayar terisi sendiri.

**Selalu periksa angkanya sebelum menekan Tambah.** Bila hasil pembacaan
diragukan, aplikasi menandainya dengan peringatan kuning.

### Perkiraan biaya

Sekitar **$0,015 (±Rp 250) per struk** dengan Claude Opus 5. Seratus struk
sebulan berarti sekitar Rp 25.000. Untuk menekan biaya, ubah `effort` di
`api/scan-receipt.js` dari `'medium'` ke `'low'`.

### Foto struk

Foto tersimpan **7 hari** lalu terhapus otomatis, dan bisa dibuka lewat ikon 🧾
di daftar transaksi. Foto disimpan sebagai dokumen Firestore biasa (bukan
Firebase Storage) supaya tetap muat di paket gratis Spark, sehingga dikompres
dulu di browser. Pembersihan berjalan saat aplikasi dibuka; foto juga langsung
ikut terhapus bila transaksinya dihapus. Foto **tidak** ikut dalam file Backup.

---

## 📱 Step 6 — Install ke HP

Butuh URL HTTPS (hasil deploy), tidak bisa dari `localhost`.

**Android (Chrome):** buka link → menu **⋮** → **Install app** / **Add to Home screen**

**iPhone (Safari):** buka link → ikon **Share** → **Add to Home Screen**

---

## ☁️ Cara kerja penyimpanan

- Setiap penambahan atau penghapusan langsung tersimpan ke Firestore
- Indikator **"Tersimpan ☁️"** muncul saat sinkronisasi berhasil
- Data tersimpan di jalur `users/{uid}/{tahun}_{bulan}_{in|out}` — terpisah per akun
- Buka dari perangkat lain dengan akun yang sama, datanya identik
- **Transaksi rutin** dan **limit budget** disimpan di `localStorage`, bukan cloud —
  keduanya tidak ikut berpindah antar perangkat, tapi ikut terbawa lewat fitur Backup

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
