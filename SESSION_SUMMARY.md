# OmniPDF Studio: Comprehensive Engineering & Development Session Summary

- **Document Version**: 1.2.6
- **Date**: September 30, 2026
- **Project**: OmniPDF Studio (`Project-Capstone-JH`)
- **Advising Faculty**: Bapak Janoe Hendarto
- **Engineering Lead**: VelAstra
- **Repository**: [github.com/VelAstra/Project-Capstone-JH](https://github.com/VelAstra/Project-Capstone-JH)

---

## 1. Executive Summary & Core Objectives

The objective of this comprehensive engineering session was to transform **OmniPDF Studio** from a legacy, heavy Electron prototype into a high-performance, ultra-lightweight, 100% client-side offline multiplatform PDF utility suite, accompanied by rigorous UI/UX decluttering, native icon standardization, and a multi-OS continuous deployment pipeline.

### Core Problems Solved Across This Session:
1. **Binary Footprint Crisis**: Legacy Electron builds exceeded 115 MB due to packaging redundant Chromium browser runtimes and Node.js binaries for every installation.
2. **Platform Parity & Multi-Arch Distribution**: Need for lightweight native installers across Windows, Linux, macOS, and Android mobile without sacrificing offline execution or user data privacy.
3. **UI/UX Modernization & Redundant Element Cleanup**: Removal of hardcoded strings, cluttered hero banners, intrusive privacy notices, and mock data counters.
4. **Visual Identity Standardization**: Creation of a scalable modern emerald/obsidian vector brand icon and compilation into multi-resolution platform binaries (`.ico`, `.icns`, mipmaps).
5. **Linux Package Bloat Resolution**: Diagnosed and rectified a 79.38 MB AppImage packaging bottleneck, reducing Linux installer size by 96.3% to a featherweight **2.90 MB** native `.deb` package.
6. **Zero-Pollution Release Automation**: Configured a strict GitHub Actions pipeline that produces **EXACTLY 5 pristine assets** per release (4 native OS binaries + 1 IEEE-format LaTeX technical report) with a clean release interface.

---

## 2. Architectural Evolution: Native WebView Migration

OmniPDF Studio rejected monolithic browser bundling in favor of native operating system webview hosts:

| Target Platform | Runtime Architecture | Engine Host | Final Installer Size | Size vs. Electron |
| :--- | :--- | :--- | :--- | :--- |
| 🪟 **Windows** | .NET 10 WinForms Single-File | Microsoft Edge WebView2 (System Runtime) | **3.12 MB** | **-96.3%** |
| 🐧 **Linux** | Tauri v2 Core + Debian Package | WebKitGTK 4.1 (`libwebkit2gtk-4.1-0` Shared) | **2.90 MB** | **-97.5%** |
| 🍎 **macOS** | Tauri v2 Core + DMG Bundle | Apple WKWebView (macOS Native Framework) | **4.46 MB** | **-95.9%** |
| 📱 **Android** | Capacitor Mobile Shell | Android System WebView (`com.google.android.webview`) | **5.67 MB** | **-95.3%** |

### Key Architectural Tenet: 100% Client-Side Privacy
- **Zero Cloud Servers**: All PDF operations, cryptographic signatures, optical character recognition (OCR), and document conversions execute exclusively in memory on the client device.
- **Zero Telemetry**: No tracking beacons, analytics scripts, or external network requests.
- **WebAssembly & Pure JS Engines**:
  - `pdf-lib` for document assembly, encryption, and page transformations.
  - `pdf.js` for vectorized canvas rendering.
  - `tesseract.js` for offline client-side OCR.
  - `signature_pad` for vector bezier-curve signature capture.
  - `jszip` for bulk asset archiving.

---

## 3. Comprehensive Feature Suite (26+ PDF Tools)

OmniPDF Studio integrates 26 distinct PDF manipulation tools categorized into seven logical functional modules:

### A. Page Manipulation (Halaman)
1. **Merge PDF**: Concatenates multiple PDFs with custom visual ordering.
2. **Split PDF**: Extracts specific page ranges (e.g., `1-3, 5, 8-10`) or splits into individual single-page documents.
3. **Organize PDF**: Interactive drag-and-drop grid to reorder, invert, or prune pages.
4. **Rotate PDF**: 90°, 180°, and 270° clockwise rotation per page or for all pages simultaneously.
5. **Remove Pages**: Visual card selection to excise unwanted pages.
6. **Extract Pages**: Surgical extraction of selected pages into a newly spawned document.

### B. Edit & Content Augmentation (Edit & Anotasi)
7. **Visual PDF Canvas Editor**: Overlay canvas supporting freehand drawing, geometric bounding boxes, highlighters, and text insertion with undo/redo stacks.
8. **Digital Signature (Sign PDF)**: Smooth vector signature pad with stroke thickness, color selection, placement modal, and PDF-lib coordinate embedding.
9. **Watermark Engine**: Custom text stamps with configurable opacity, font scale, 45° angular rotation, and color picker.
10. **Page Numbering**: Automatic pagination (`Page X of Y`) with position presets (bottom-center, bottom-right, top-right).
11. **Flatten PDF**: Permanently burns dynamic form fields and annotations into static document geometry.

### C. Conversion from PDF (Ekspor)
12. **PDF to JPG**: High-resolution rasterization of individual pages with ZIP batch packaging.
13. **PDF to Text**: Plaintext extraction with layout preservation.
14. **Extract Images**: Scans PDF XObject streams to isolate and export raw embedded graphics.
15. **Offline OCR**: Optical Character Recognition powered by client-side WebAssembly Tesseract engine.

### D. Conversion to PDF (Impor)
16. **PPTX to PDF**: Client-side slide layout rendering to PDF.
17. **Images to PDF**: Multi-image (JPG, PNG) collage compilation with margin and page orientation controls.
18. **HTML to PDF**: Converts structured HTML markup into printable vector PDF documents.

### E. Security & Optimization (Keamanan)
19. **Compress PDF**: Object stream deduplication and image downsampling for size reduction.
20. **Protect PDF**: Standard 128-bit/256-bit AES encryption with password authorization.
21. **Unlock PDF**: Password authentication and decryption for authorized users.
22. **Metadata Editor**: Inspects and edits Title, Author, Subject, Keywords, and Creator fields.

### F. Layout & Print Geometry (Tata Letak)
23. **N-Up Multi-Page (Pages Per Sheet)**: 2-up, 4-up, 9-up, and 16-up layout imposition.
24. **Crop Margins**: Proportional whitespace cropping.
25. **Page Resizing**: Standard dimension transformation (A4, US Letter, Legal, Tabloid).

### G. Document Intelligence (Kecerdasan)
26. **AI Document Summarizer & Multi-Language Translator**: Client-side semantic extraction and language translation.

---

## 4. UI/UX Modernization & Technical Debt Eradication

During the course of the session, thorough UI polishing and code hygiene were enforced:

### 1. Modern Flat Palette Implementation
A cohesive color palette was deployed across Light and Dark themes, managed via CSS custom properties and instant toggle with `localStorage` persistence:
- **Light Theme**: Canvas (`#FBFFE4`), Primary Brand (`#3D8D7A`), Accents (`#B3D8A8`), Sidebar Container (`#A3D1C6`), High-Contrast Text (`#092328`).
- **Dark Theme**: Deep Slate Base (`#092328`), Container Surfaces (`#12544F`), Active Brand (`#2A835F`), Muted Mint Accents (`#8BBB92`), Soft White Text (`#FBFFE4`).

### 2. Elimination of Distracting UI Elements & Hardcoded Strings
- **Hero Dashboard Banner Removed**: Excised the redundant welcome banner (`"All the PDF Tools You Need, 100% Private..."`) and static counter boxes (`"0 Files Processed"`, `"100% Data Privacy"`), allowing immediate user access to the tool grid.
- **In-Tool Sandbox Banners Removed**: Eliminated repetitive notices (such as the OCR private sandbox info box) across tool panels to maintain a clean, distraction-free configuration interface.
- **Header & Sidebar De-cluttering**: Removed obsolete badges (`"100% Client-Side"`, `"Private Sandbox Active"`, `"Local execution. No servers."`).

### 3. Cross-Platform Vector Icon System
Designed an official SVG identity featuring an emerald/obsidian squircle with folded document geometry, and compiled it into required formats:
- Windows: Multi-layer `icon.ico` containing 16x16, 32x32, 48x48, 64x64, 128x128, and 256x256 pixel mipmaps.
- macOS: Apple Retina-ready `icon.icns`.
- Android: Vector launcher drawables and mipmaps (`ic_launcher.png`, `ic_launcher_round.png`).
- Linux: High-resolution desktop icons (32x32, 128x128, 512x512).

---

## 5. The Linux Optimization Case Study: From 79 MB to 2.90 MB

One of the central technical breakthroughs of this session was resolving the Linux package bloat:

### The Problem:
While Windows compiled to ~3.1 MB and macOS compiled to ~4.5 MB, the Linux release artifact was consistently generating at **~79.38 MB** as an AppImage.

### Root Cause Analysis:
1. **AppImage Bundling Isolation**: AppImage packages create an isolated virtual runtime. When the Tauri build tool invoked `linuxdeploy` on Ubuntu runners, it detected dependencies on WebKitGTK and bundled:
   - `libwebkit2gtk-4.1.so`
   - `libjavascriptcoregtk-4.1.so`
   - GStreamer multimedia plugins
   - Entire ICU Unicode database tables (`libicudata.so` alone is **>30 MB**)
2. **CI Packaging Script Misconfiguration**: Tauri v2 in fact **already compiled** a native Debian package in `src-tauri/target/release/bundle/deb/` which measured only **4.37 MB**. However, the CI workflow script checked for `compgen -G "*.AppImage"` first, consistently selecting the bloated 79.4 MB image and discarding the `.deb`.

### The Solution:
1. **Prioritize Native Debian Distribution (`.deb`)**:
   Updated `.github/workflows/release.yml` to package `OmniPDF-Studio-Linux.deb`. In Debian/Ubuntu, WebKitGTK is treated as a shared dynamic library (`Depends: libwebkit2gtk-4.1-0`), eliminating all bundled browser redundancy.
2. **Rust Profile Release Optimization**:
   Configured high-efficiency compiler flags in `src-tauri/Cargo.toml`:
   ```toml
   [profile.release]
   panic = "abort"      # Strips unwind tables and landing pads
   codegen-units = 1    # Enables maximum cross-crate compiler optimization
   lto = true           # Link-Time Optimization across all dependency crates
   opt-level = "z"      # Size-optimized LLVM code generation
   strip = true         # Automatically strips all debug symbols and names
   ```

### Result:
- The Linux installer package plummeted from **79.38 MB down to 2.90 MB**!
- That represents a **96.3% size reduction**, making the Linux native package the smallest desktop build across all supported operating systems.

---

## 6. Strict Multiplatform CI/CD Pipeline & GitHub Release Policy

The automated delivery pipeline in `.github/workflows/release.yml` enforces strict quality gates:

### Build Matrix:
- `build-windows` (windows-latest): .NET 10 Native AOT / Single-File Publisher.
- `build-linux` (ubuntu-latest): Tauri v2 with WebKitGTK dependencies + `.deb` bundler.
- `build-macos` (macos-latest): Tauri v2 Rust toolchain + DMG packager.
- `build-android` (ubuntu-latest): JDK 21, Android SDK, Capacitor Android Gradle APK assembler.
- `publish-release` (ubuntu-latest): Download artifacts, clean auxiliary files, attach LaTeX PDF, and publish.

### Strict Release Rules Satisfied:
1. **EXACTLY 5 Release Assets**:
   1. `OmniPDF-Studio-Windows-x64.exe` (~3.12 MB)
   2. `OmniPDF-Studio-macOS.dmg` (~4.46 MB)
   3. `OmniPDF-Studio-Android.apk` (~5.67 MB)
   4. `OmniPDF-Studio-Linux.deb` (~2.90 MB)
   5. `OmniPDF-Studio-Technical-Report.pdf` (~0.19 MB)
2. **Zero Waste**: No `.blockmap`, `.yml`, or temporary zip files attached.
3. **Empty Release Body**: Release body is configured as empty (`body: ""`) on GitHub Releases.

---

## 7. Verification Proof & Quality Gates

All verification gates have been satisfied:
- `npm test`: Passed (26+ client-side tools loaded successfully).
- `node scripts/prepare-dist.js`: Dist assets validated (2.76 MB web core).
- `pdflatex`: Technical report compiled cleanly into IEEE-styled 5-page publication document.
- GitHub Release REST API: Verified tag `v1.2.5` with 5 assets, and prepared `v1.2.6` with the complete technical summary.
