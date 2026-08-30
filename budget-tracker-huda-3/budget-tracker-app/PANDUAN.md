# 📱 Panduan Setup Budget Tracker Huda

## File yang kamu punya:
- `index.html` — aplikasi utama
- `manifest.json` — supaya bisa diinstall ke HP
- `PANDUAN.md` — file ini

---

## 🔥 Step 1 — Setup Firebase (10 menit, gratis selamanya)

### 1.1 Buat Project Firebase
1. Buka [console.firebase.google.com](https://console.firebase.google.com)
2. Klik **"Add project"**
3. Nama project: `budget-huda` → klik Continue
4. Matikan Google Analytics (tidak diperlukan) → klik **Create project**

### 1.2 Daftarkan Web App
1. Di dashboard project, klik ikon **`</>`** (Web)
2. App nickname: `Budget Huda` → klik **Register app**
3. Kamu akan melihat konfigurasi seperti ini — **simpan dulu!**

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",           ← copy ini
  authDomain: "budget-huda.firebaseapp.com",  ← copy ini
  projectId: "budget-huda",      ← copy ini
  appId: "1:123:web:abc123",    ← copy ini
};
```

4. Klik **Continue to console**

### 1.3 Aktifkan Firestore Database
1. Di sidebar kiri → **Build** → **Firestore Database**
2. Klik **Create database**
3. Pilih **Start in test mode** → Next
4. Pilih lokasi server: `asia-southeast1 (Singapore)` → Enable
5. Tunggu beberapa detik sampai database siap

---

## 🌐 Step 2 — Upload & Buka Aplikasi

### Cara Termudah: Buka Langsung di Browser
1. Download folder `budget-tracker-app`
2. Buka file `index.html` di browser (Chrome/Edge)
3. Masukkan konfigurasi Firebase dari Step 1.2
4. Klik **Simpan & Mulai**

### Cara Lebih Baik: Deploy ke Netlify (gratis, dapat link permanen)
1. Buka [netlify.com](https://netlify.com) → Sign up gratis
2. Drag & drop folder `budget-tracker-app` ke halaman Netlify
3. Kamu dapat link seperti `https://budget-huda-abc123.netlify.app`
4. Link ini bisa dibuka dari HP & laptop mana saja!

---

## 📱 Step 3 — Install ke HP (jadi seperti aplikasi)

### Android (Chrome):
1. Buka link aplikasi di Chrome
2. Klik ikon **⋮** (titik tiga) di pojok kanan atas
3. Pilih **"Add to Home screen"** / **"Install app"**
4. Konfirmasi → aplikasi muncul di homescreen! ✅

### iPhone (Safari):
1. Buka link aplikasi di Safari
2. Tap ikon **Share** (kotak dengan panah ke atas)
3. Scroll ke bawah → pilih **"Add to Home Screen"**
4. Beri nama → tap **Add** ✅

---

## ☁️ Cara Kerja Cloud Sync

- Setiap kamu tambah/hapus data → **langsung tersimpan ke Firebase**
- Buka dari HP → data sama persis dengan di laptop
- Data **tidak hilang** walau browser ditutup atau HP mati
- Indikator **"Tersimpan ☁️"** muncul saat data berhasil sync

---

## 🔒 Keamanan

Saat ini database dalam mode **test** (siapa saja yang punya link bisa baca/tulis).  
Untuk keamanan ekstra setelah 30 hari:

1. Firestore → **Rules** → ubah menjadi:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // ganti dengan auth jika perlu
    }
  }
}
```

---

## ❓ Pertanyaan Umum

**Q: Apakah dataku aman?**  
A: Data tersimpan di Google Firebase (infrastruktur Google), sangat aman.

**Q: Apakah gratis?**  
A: Ya! Firebase gratis untuk penggunaan personal (Spark plan). Dengan penggunaan normal, tidak akan melebihi batas gratis.

**Q: Bagaimana kalau offline?**  
A: Data yang sudah diload sebelumnya tetap bisa dilihat. Penambahan data baru memerlukan koneksi internet.

**Q: Bisa dipakai lebih dari 1 orang?**  
A: Bisa! Siapa saja yang punya link dan konfigurasi Firebase yang sama bisa akses data yang sama.
