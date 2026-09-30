# AeroMark ✨

> **Project Capstone** dibawah bimbingan **Bapak Janoe Hendarto**  
> *A Modern, High-Performance Markdown Editor & Reader with Live Preview, Multi-Tabs, and Native Desktop Integration.*

---

## 📖 Tentang AeroMark

**AeroMark** adalah aplikasi editor dan pembaca Markdown modern yang dirancang untuk kecepatan, estetika, dan produktivitas maksimal. Dibangun menggunakan arsitektur hybrid modern dengan host desktop **C# .NET 10 (WinForms & Microsoft WebView2)** dan antarmuka web yang responsif, AeroMark berjalan 100% lokal, cepat, dan mandiri (*self-contained*).

AeroMark juga dilengkapi dengan jembatan komunikasi IPC (*Inter-Process Communication*) yang memungkinkan integrasi langsung ke sistem berkas desktop maupun perangkat Android.

---

## 🚀 Fitur Unggulan

| Kategori | Fitur | Keterangan |
| :--- | :--- | :--- |
| **Manajemen Dokumen** | **Multi-Tab File Manager** | Buka banyak file Markdown (`.md`, `.txt`) sekaligus dalam tab interaktif dengan tombol tutup dan pergantian cepat. |
| | **Buka & Simpan Berkas** | Integrasi dialog file native Windows (*Open File* & *Save to Disk*) langsung ke sistem operasi. |
| | **Export ke PDF** | Cetak atau simpan dokumen Markdown yang sudah ter-render menjadi PDF berkualitas tinggi dalam 1 klik. |
| **Pengalaman Menulis** | **Split View & Reader Mode** | Mode terpisah (Editor + Live Preview) atau Mode Baca bebas gangguan (*distraction-free reader*). |
| | **Synchronized Scrolling** | Pengguliran tersinkronisasi otomatis secara mulus antara editor teks dan panel pratinjau. |
| | **Daftar Isi Otomatis (TOC)** | *Table of Contents* interaktif di bilah sisi yang otomatis mendeteksi heading (H1, H2, H3) dengan *smooth scroll*. |
| | **Statistik Real-Time** | Penghitung jumlah kata (*words count*) dan estimasi waktu baca (*read time*) yang diperbarui secara langsung. |
| **Ekspresi Konten** | **GitHub-Style Alerts** | Mendukung callout boxes resmi GitHub: `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, dan `[!CAUTION]`. |
| | **Rumus Matematika (KaTeX)** | Render persamaan matematika LaTeX instan baik inline (`$...$`) maupun display block (`$$...$$`). |
| | **Diagram & Flowchart (Mermaid)** | Dukungan visualisasi diagram Mermaid.js langsung di dalam blok kode ````mermaid`. |
| | **Syntax Highlighting (Prism.js)** | Penyorotan sintaks kode untuk berbagai bahasa pemrograman (JavaScript, Python, C#, CSS, Markdown). |
| | **Checklists & Tables** | Dukungan penuh GitHub Flavored Markdown (GFM) untuk daftar periksa dan tabel data. |
| **Estetika & Antarmuka** | **4 Pilihan Tema Visual** | Ganti tema seketika antara: **Dark Mode**, **Light Mode**, **Sepia Mode**, dan **Aurora Mode**. |
| | **Glassmorphism UI** | Desain modern berbasis panel kaca blur dengan transisi halus dan tipografi tajam (*Outfit*, *Inter*, *Fira Code*). |
| **Multiplatform & IPC** | **Windows Native Host** | Host executable C# .NET 10 tunggal (*single-file self-contained* tanpa perlu install runtime eksternal). |
| | **Android IPC Bridge** | API bawaan (`window.Android`, `loadFileContentAndroid`) untuk integrasi mudah ke WebView Android. |
| | **Web Standalone** | Dapat dijalankan langsung di peramban web modern apa pun secara offline. |

---

## 📁 Struktur Repositori

```
Project-Capstone-JH/
├── AeroMark.csproj        # Konfigurasi proyek .NET 10 WinForms WebView2
├── Program.cs             # Entry point C# dan handler IPC Desktop
├── html/                  # Antarmuka web client-side AeroMark
│   ├── index.html         # Struktur tampilan editor, sidebar, tabs, dan toolbar
│   ├── styles.css         # Styling Glassmorphism, 4 tema visual, dan print media query
│   ├── app.js             # Logika inti: tabs, marked, KaTeX, Prism, Mermaid, IPC
│   └── sample.md          # Dokumen contoh interaktif
├── .gitignore             # Pengabaian build output .NET, cache, dan temporary files
├── LICENSE                # Lisensi sumber terbuka GNU GPLv3
└── README.md              # Dokumentasi lengkap proyek
```

---

## 🛠️ Cara Menjalankan & Membangun Proyek

### Prasyarat
* [.NET 10 SDK](https://dotnet.microsoft.com/download)
* Sistem operasi: Windows 10/11 (untuk C# native host) atau Browser modern (untuk versi Web)

### 1. Menjalankan Versi Desktop (Development)
```bash
# Clone repository
git clone https://github.com/VelAstra/Project-Capstone-JH.git
cd Project-Capstone-JH

# Jalankan aplikasi langsung
dotnet run
```

### 2. Membangun Executable Mandiri (*Self-Contained Single-File*)
```bash
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o publish
```
File `AeroMark.exe` portabel siap pakai akan tersedia di dalam folder `publish/`.

### 3. Menjalankan Versi Web Standalone
Buka file [`html/index.html`](file:///c:/Users/Rayhan/Documents/GitHub/Project-Capstone-JH/html/index.html) langsung menggunakan peramban web apa pun (Chrome, Edge, Firefox, Safari).

---

## 📦 Rilis & Paket Download (Single-File Installers untuk 4 OS)

AeroMark menyediakan berkas installer/executable tunggal (*single file*) untuk setiap sistem operasi tanpa perlu instalasi rumit melalui CLI. Pengguna cukup mengunduh 1 file dan langsung klik untuk menggunakan:

| Sistem Operasi | Berkas Rilis (Tinggal Klik) | Format | Deskripsi |
| :--- | :--- | :---: | :--- |
| 🪟 **Windows** | [**`AeroMark-Windows.exe`**](https://github.com/VelAstra/Project-Capstone-JH/releases/download/v1.0.0/AeroMark-Windows.exe) | `.exe` | Single-file mandiri (.NET 10 WebView2), dobel klik langsung jalan tanpa install runtime. |
| 🐧 **Linux** | [**`AeroMark-Linux.AppImage`**](https://github.com/VelAstra/Project-Capstone-JH/releases/download/v1.0.0/AeroMark-Linux.AppImage) | `.AppImage` | Format universal Linux x64, dobel klik langsung jalan di Ubuntu, Fedora, Debian, dll. |
| 🍏 **macOS** | [**`AeroMark-macOS.dmg`**](https://github.com/VelAstra/Project-Capstone-JH/releases/download/v1.0.0/AeroMark-macOS.dmg) | `.dmg` | Disk image universal (Apple Silicon M-Series & Intel), drag ke folder Applications. |
| 🤖 **Android** | [**`AeroMark-Android.apk`**](https://github.com/VelAstra/Project-Capstone-JH/releases/download/v1.0.0/AeroMark-Android.apk) | `.apk` | Paket instalasi mandiri Android, tap untuk memasang di smartphone atau tablet. |

Semua rilis resmi tersedia di halaman [**GitHub Releases**](https://github.com/VelAstra/Project-Capstone-JH/releases).

---

## 📄 Lisensi
Didistribusikan di bawah lisensi [GNU General Public License v3.0](LICENSE).
