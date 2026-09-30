# Project-Capstone-JH: OmniPDF Studio

> **Project Capstone** dibawah bimbingan **Bapak Janoe Hendarto**
> Aplikasi Manipulasi PDF Multiplatform Lokal & 100% Offline (Windows, Linux, macOS, dan Android)

---

## 🌐 1. Riset & Survei Fitur Aplikasi PDF di Internet

Berdasarkan analisis mendalam terhadap berbagai platform manipulasi PDF populer dunia (*iLovePDF, Smallpdf, PDF24 Creator, Sejda PDF, Stirling-PDF, Adobe Acrobat DC, Foxit, PDF Candy, dan PDFtk*), berikut adalah taksonomi lengkap seluruh jasa dan fitur manipulasi PDF yang ada di internet:

| Kategori | Fitur / Layanan Utama | Deskripsi & Kegunaan |
| :--- | :--- | :--- |
| **Pengorganisasian Halaman** | **Merge / Gabung PDF** | Menggabungkan beberapa dokumen PDF menjadi satu berkas secara berurutan. |
| | **Split / Pisah PDF** | Memisahkan satu dokumen menjadi per halaman atau potongan rentang halaman (ZIP). |
| | **Ekstrak Halaman** | Mengambil halaman spesifik (misal: 1, 3, 5-8) ke dalam berkas PDF mandiri. |
| | **Hapus Halaman** | Membuang lembaran halaman yang tidak terpakai atau berlebih. |
| | **Rotasi Halaman** | Memutar orientasi halaman (90°, 180°, 270°) per lembar atau massal. |
| | **Urutkan / Balik (Reorder/Reverse)** | Mengubah urutan halaman atau membalik susunan dari belakang ke depan. |
| | **Potong / Crop Margins** | Memangkas batas pinggir putih pada dokumen scan atau cetak. |
| **Konversi Format** | **Gambar ke PDF (Images to PDF)** | Mengubah sekumpulan gambar (JPG, PNG, WebP) menjadi satu berkas PDF dengan layout A4/Letter. |
| | **PDF ke Gambar (PDF to Images)** | Mengekstrak setiap halaman dokumen menjadi file JPG/PNG beresolusi tinggi. |
| | **Office ke PDF & Sebaliknya** | Konversi dokumen Word (.docx), Excel (.xlsx), PowerPoint (.pptx) ke/dari format PDF. |
| | **PDF ke Teks / Markdown** | Ekstraksi konten tekstual untuk keperluan dokumentasi atau LLM ingestion. |
| | **HTML / Web ke PDF** | Merender tautan situs web atau file HTML menjadi format cetak dokumen PDF. |
| **Keamanan & Legalitas** | **Watermark (Tanda Air)** | Membubuhkan teks cap kepemilikan/rahasia dengan sudut kemiringan dan transparansi. |
| | **Tanda Tangan Digital (Sign PDF)** | Membubuhkan tanda tangan digital langsung melalui goresan tangan di canvas. |
| | **Proteksi Kata Sandi (Protect/Encrypt)** | Mengunci akses dokumen menggunakan enkripsi password. |
| | **Buka Sandi (Unlock/Decrypt)** | Menghapus penguncian sandi dari dokumen legal yang dimiliki. |
| | **Redaksi & Sensor (Redaction/Whiteout)** | Menutupi data sensitif (PII) dengan blok hitam/putih permanen. |
| | **Flatten PDF / Kunci Formulir** | Meratakan seluruh form input interaktif menjadi elemen statis agar tidak dapat diubah lagi. |
| **Optimasi & Informasi** | **Kompresi PDF (Shrink & Compress)** | Merampingkan ukuran byte dokumen dengan merestrukturisasi alur objek stream. |
| | **Nomor Halaman (Header & Footer)** | Menambahkan penomoran otomatis (`Halaman n dari total`) di posisi atas/bawah. |
| | **Edit Metadata Dokumen** | Melihat & mengubah informasi *Judul, Penulis, Subjek, Kata Kunci, Pembuat*. |
| | **Konversi Grayscale / Hitam Putih** | Mengubah seluruh spektrum warna menjadi hitam-putih untuk hemat tinta cetak. |
| **Fitur Lanjutan (Advanced)** | **OCR (Optical Character Recognition)** | Mendeteksi teks pada dokumen hasil scan fisik. |
| | **Bandingkan PDF (Compare PDFs)** | Menemukan perbedaan teks atau visual antara dua revisi dokumen PDF. |
| | **Batch Processing Tanpa Batas** | Memproses ratusan dokumen sekaligus secara paralel tanpa batasan ukuran file. |

---

## 🎨 2. Standar Desain UI & Palet Warna (Flat Design)

Aplikasi dibangun dengan filosofi **Flat Design** murni (**tanpa gradien**), mengutamakan ketegasan visual, kontras tinggi, dan fungsionalitas:

### ☀️ Mode Terang (Light Mode)
* **`#FBFFE4`**: Latar belakang utama (background) dokumen dan kanvas yang ramah mata.
* **`#3D8D7A`**: Warna primer tombol aksi utama, header aksen, dan garis batas solid.
* **`#B3D8A8`**: Warna sekunder untuk kartu ringkasan, badge, dan hover efek.
* **`#A3D1C6`**: Warna batas panel, sub-surface, serta latar belakang bilah sisi (sidebar).

### 🌙 Mode Gelap (Dark Mode)
* **`#092328`**: Latar belakang utama (deep slate-teal) yang hemat daya.
* **`#12544F`**: Warna permukaan kartu (surface) dan bilah sisi (sidebar).
* **`#2A835F`**: Warna primer tombol aksi dan indikator status aktif.
* **`#8BBB92`**: Warna sekunder untuk teks sorotan, ikon, dan garis batas halus.

> **Tombol Pengubah Tema:** Terdapat tombol *switch* langsung di pojok kanan atas layar dan di bilah sisi (*sidebar*) yang menyimpan preferensi tema ke `localStorage`.

---

## 🚀 3. Arsitektur 100% Lokal & Offline

* **Zero Cloud Dependency**: Semua manipulasi PDF dijalankan langsung pada memori perangkat menggunakan engine berbasis JavaScript modern (`pdf-lib`, `jszip`, dan HTML5 Canvas).
* **Privasi 100% Terjaga**: Dokumen tidak pernah diunggah ke server manapun di internet.
* **Batch Processing Fleksibel**: Pengguna dapat memilih berapapun banyaknya file PDF maupun gambar sekaligus.

---

## 📦 4. Distribusi Multiplatform (4 Target Rilis di GitHub)

Proyek ini telah dilengkapi dengan pipeline otomatis **GitHub Actions** (`.github/workflows/release.yml`) yang secara otomatis membuat 4 file rilis (*GitHub Release*) untuk setiap platform:

1. **Windows**: Installer (`.exe`) & Portable Executable (`.exe`).
2. **Linux**: Format universal (`.AppImage`) & paket Debian/Ubuntu (`.deb`).
3. **macOS**: Apple Disk Image (`.dmg`) untuk Intel dan Apple Silicon.
4. **Android**: Berkas instalasi mandiri Android Package (`.apk`).

---

## 🛠️ 5. Cara Menjalankan Aplikasi Secara Lokal

### Prasyarat
* Node.js (v18 ke atas) & npm

### Menjalankan Versi Web / Dev Server
```bash
# 1. Masuk ke direktori proyek
cd Project-Capstone-JH

# 2. Pasang dependensi
npm install

# 3. Jalankan pengujian otomatis (Unit Tests)
npm test

# 4. Jalankan mode pengembangan
npm run dev
```
Buka browser pada alamat `http://localhost:5173`.

### Menjalankan Aplikasi Desktop (Electron)
```bash
npm run electron:dev
```

### Membangun Paket Android APK
```bash
npm run cap:build
```

---

## 🧪 6. Hasil Verifikasi Otomatis
Unit test mencakup pengujian komprehensif terhadap operasi inti:
* ✅ Penggabungan berkas (*Merge PDF*)
* ✅ Pemisahan halaman (*Split PDF*)
* ✅ Ekstraksi rentang halaman (*Extract Pages*)
* ✅ Penghapusan halaman (*Delete Pages*)
* ✅ Rotasi sudut halaman (*Rotate Pages*)
* ✅ Penambahan tanda air (*Watermark*)
* ✅ Penomoran halaman dinamis (*Page Numbers*)
* ✅ Modifikasi metadata dokumen (*Metadata Update*)

Seluruh pengujian lolos dengan exit code `0`.
